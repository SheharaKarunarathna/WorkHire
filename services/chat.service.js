const pool = require('../db');

/**
 * Save a chat message to the database
 * @param {string} requestId - Request UUID
 * @param {string} senderAccountId - Account UUID of the sender
 * @param {string} messageText - Content of the message
 */
async function saveChatMessage(requestId, senderAccountId, messageText) {
	const query = `
		INSERT INTO chat_messages (request_id, sender_account_id, message_text)
		VALUES ($1, $2, $3)
		RETURNING id, request_id, sender_account_id, message_text, created_at
	`;

	const result = await pool.query(query, [requestId, senderAccountId, messageText]);
	return result.rows[0];
}

/**
 * Get historical chat messages for a specific request
 * @param {string} requestId - Request UUID
 * @param {string} requesterAccountId - Account UUID of the requesting user/worker
 */
async function getChatHistory(requestId, requesterAccountId) {
	// First check if request exists and user is participant (user, assigned worker, or target worker)
	const requestRes = await pool.query(
		`SELECT r.id, r.user_account_id, r.assigned_worker_account_id, d.target_worker_account_id
		 FROM requests r
		 LEFT JOIN direct_request_details d ON r.id = d.request_id
		 WHERE r.id = $1 LIMIT 1`,
		[requestId]
	);

	if (requestRes.rowCount === 0) {
		const error = new Error('Request not found');
		error.statusCode = 404;
		throw error;
	}

	const req = requestRes.rows[0];
	const isParticipant =
		req.user_account_id === requesterAccountId ||
		req.assigned_worker_account_id === requesterAccountId ||
		req.target_worker_account_id === requesterAccountId;

	if (!isParticipant) {
		const error = new Error('Forbidden: You are not a participant in this request chat');
		error.statusCode = 403;
		throw error;
	}

	const historyQuery = `
		SELECT 
			m.id,
			m.request_id,
			m.sender_account_id,
			a.full_name AS sender_name,
			m.message_text,
			m.created_at
		FROM chat_messages m
		JOIN accounts a ON m.sender_account_id = a.id
		WHERE m.request_id = $1
		ORDER BY m.created_at ASC
	`;

	const result = await pool.query(historyQuery, [requestId]);
	return result.rows;
}

module.exports = {
	saveChatMessage,
	getChatHistory,
};
