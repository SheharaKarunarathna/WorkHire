import React, { useState } from 'react';
import {
  Plus, Search, Filter, Clock, CheckCircle2, XCircle, AlertCircle,
  DollarSign, MessageSquare, Wrench, ChevronRight, User, Star, ShieldCheck,
  Send, Calendar, MapPin, Eye, FileText, X, Check
} from 'lucide-react';

export default function UserDashboard({ activeTab, setActiveTab }) {
  // Mock requests state representing GET /requests/my-requests
  const [requests, setRequests] = useState([
    {
      id: 'REQ-901',
      title: 'Commercial HVAC System Maintenance & Filter Swap',
      category: 'HVAC',
      request_type: 'open',
      status: 'pending',
      location: 'Enterprise Tower, Suite 400',
      description: 'Quarterly inspection and high-efficiency air filter replacement for 3 roof HVAC units.',
      scheduled_at: '2026-08-18 09:00 AM',
      created_at: '2026-08-16 10:30 AM',
      bids: [
        { id: 'BID-101', worker_name: 'David Vance', worker_id: 'worker-4422', rating: 4.95, ratings_count: 38, amount: 140.00, message: 'Certified HVAC engineer available tomorrow morning at 8:00 AM.', status: 'active', verified: true },
        { id: 'BID-102', worker_name: 'Elena Rostova', worker_id: 'worker-5511', rating: 4.88, ratings_count: 24, amount: 125.00, message: 'Includes full filter replacement kit and duct air quality check.', status: 'active', verified: true },
      ],
      assigned_worker: null,
    },
    {
      id: 'REQ-902',
      title: 'Direct Repair: Main Circuit Breaker Tripping',
      category: 'Electrical',
      request_type: 'direct',
      status: 'in_progress',
      location: '124 Industrial Parkway',
      description: 'Urgent main electrical panel diagnosis and breaker replacement.',
      budget: '$250.00',
      scheduled_at: '2026-08-16 02:00 PM',
      created_at: '2026-08-15 02:15 PM',
      assigned_worker: { id: 'worker-4422', name: 'David Vance', phone: '+1 (555) 349-8821', rating: 4.95, verification_status: 'verified' },
      bids: [],
      chat: [
        { sender: 'worker', text: 'Hello Samantha! I have arrived at the Industrial Parkway site.', time: '02:30 PM' },
        { sender: 'user', text: 'Great! The panel box is located in basement room B-2.', time: '02:32 PM' },
      ]
    },
    {
      id: 'REQ-903',
      title: 'Plumbing Line Inspection & Drain Clearing',
      category: 'Plumbing',
      request_type: 'open',
      status: 'completed',
      location: 'Westside Logistics Hub',
      description: 'Camera inspection of main drainage sewer lines.',
      scheduled_at: '2026-08-12 10:00 AM',
      created_at: '2026-08-12 09:00 AM',
      assigned_worker: { id: 'worker-8811', name: 'Robert Chen', rating: 4.90, verification_status: 'verified' },
      bids: [],
      review: null
    }
  ]);

  // Mock Workers Directory representing GET /workers
  const [workers] = useState([
    {
      id: 'worker-4422',
      name: 'David Vance',
      category: 'Electrical & HVAC',
      rating: 4.95,
      ratings_count: 38,
      hourly_rate: '$65/hr',
      experience_years: 9,
      verification_status: 'verified',
      skills: ['Electrical Wiring', 'Circuit Breakers', 'HVAC Repair', 'Generator Diagnostics'],
      bio: 'Master Electrician and certified HVAC technician with 9+ years of commercial contract experience.',
      schedule: [
        { id: 'SLOT-1', date: '2026-08-17', time: '08:00 AM - 12:00 PM', status: 'available' },
        { id: 'SLOT-3', date: '2026-08-18', time: '09:00 AM - 01:00 PM', status: 'available' },
      ],
      reviews: [
        { user: 'Alexander V.', rating: 5, comment: 'Punctual, professional, and diagnosed our panel fault in under 30 minutes.' },
        { user: 'Maria G.', rating: 5, comment: 'Clean work and provided full compliance documentation.' }
      ]
    },
    {
      id: 'worker-5511',
      name: 'Elena Rostova',
      category: 'HVAC & Ductwork',
      rating: 4.88,
      ratings_count: 24,
      hourly_rate: '$60/hr',
      experience_years: 7,
      verification_status: 'verified',
      skills: ['HVAC Installation', 'Duct Inspection', 'Filter Servicing', 'Refrigerant Checks'],
      bio: 'Commercial HVAC specialist focusing on air filtration system optimization and emergency servicing.',
      schedule: [
        { id: 'SLOT-10', date: '2026-08-17', time: '01:00 PM - 05:00 PM', status: 'available' },
      ],
      reviews: [
        { user: 'Logistics Center', rating: 5, comment: 'Great service and honest pricing for filter maintenance.' }
      ]
    },
    {
      id: 'worker-8811',
      name: 'Robert Chen',
      category: 'Plumbing & Pipefitting',
      rating: 4.90,
      ratings_count: 52,
      hourly_rate: '$70/hr',
      experience_years: 12,
      verification_status: 'verified',
      skills: ['Sewer Line Inspection', 'Pipe Leak Repair', 'Hydro Jetting', 'Fixture Installs'],
      bio: 'Senior plumber equipped with video pipe inspection cameras and heavy drain augers.',
      schedule: [
        { id: 'SLOT-20', date: '2026-08-18', time: '10:00 AM - 02:00 PM', status: 'available' },
      ],
      reviews: [
        { user: 'Samantha W.', rating: 5, comment: 'Cleared our warehouse main line fast. Highly recommended!' }
      ]
    }
  ]);

  // UI state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [directHireWorker, setDirectHireWorker] = useState(null);
  const [chatRequest, setChatRequest] = useState(null);
  const [reviewModalReq, setReviewModalReq] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchWorkerQuery, setSearchWorkerQuery] = useState('');
  const [workerCategoryFilter, setWorkerCategoryFilter] = useState('all');

  // Form State for New Request (POST /requests)
  const [reqType, setReqType] = useState('open');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electrical');
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [assignedWorkerId, setAssignedWorkerId] = useState('');

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Chat Input State
  const [chatText, setChatText] = useState('');

  // Handlers
  const handleCreateRequest = (e) => {
    e.preventDefault();
    if (!title || !desc || !location) return;

    let assignedObj = null;
    if (reqType === 'direct') {
      const wId = assignedWorkerId || (directHireWorker ? directHireWorker.id : 'worker-4422');
      const foundW = workers.find(w => w.id === wId);
      if (foundW) {
        assignedObj = { id: foundW.id, name: foundW.name, rating: foundW.rating, verification_status: foundW.verification_status };
      }
    }

    const newReq = {
      id: `REQ-${Math.floor(910 + Math.random() * 89)}`,
      title,
      category,
      request_type: reqType,
      status: reqType === 'direct' ? 'pending' : 'pending',
      location,
      description: desc,
      budget: budget ? `$${budget}` : null,
      scheduled_at: scheduledAt || '2026-08-19 10:00 AM',
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bids: [],
      assigned_worker: assignedObj,
      chat: []
    };

    setRequests([newReq, ...requests]);
    setTitle('');
    setDesc('');
    setLocation('');
    setBudget('');
    setScheduledAt('');
    setDirectHireWorker(null);
    setActiveTab('requests');
  };

  const handleAcceptBid = (reqId, bid) => {
    setRequests(requests.map(req => {
      if (req.id === reqId) {
        return {
          ...req,
          status: 'accepted',
          assigned_worker: { id: bid.worker_id, name: bid.worker_name, rating: bid.rating, verification_status: 'verified' },
          bids: req.bids.map(b => b.id === bid.id ? { ...b, status: 'accepted' } : { ...b, status: 'rejected' })
        };
      }
      return req;
    }));
    setSelectedRequest(null);
  };

  const handleCancelRequest = (reqId) => {
    setRequests(requests.map(req => req.id === reqId ? { ...req, status: 'cancelled' } : req));
    if (selectedRequest) setSelectedRequest(null);
  };

  const handleSendReview = (e) => {
    e.preventDefault();
    if (!reviewModalReq) return;
    setRequests(requests.map(r => r.id === reviewModalReq.id ? { ...r, review: { rating: reviewRating, comment: reviewComment } } : r));
    setReviewModalReq(null);
    setReviewComment('');
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatText.trim() || !chatRequest) return;
    const msg = { sender: 'user', text: chatText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const updated = { ...chatRequest, chat: [...(chatRequest.chat || []), msg] };
    setChatRequest(updated);
    setRequests(requests.map(r => r.id === chatRequest.id ? updated : r));
    setChatText('');
  };

  const filteredRequests = requests.filter(r => {
    if (filterType === 'open') return r.request_type === 'open';
    if (filterType === 'direct') return r.request_type === 'direct';
    return true;
  });

  const filteredWorkers = workers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchWorkerQuery.toLowerCase()) ||
                          w.skills.some(s => s.toLowerCase().includes(searchWorkerQuery.toLowerCase()));
    const matchesCat = workerCategoryFilter === 'all' || w.category.toLowerCase().includes(workerCategoryFilter.toLowerCase());
    return matchesSearch && matchesCat;
  });

  return (
    <div className="dashboard-content">
      {/* -------------------- TAB: MY REQUESTS -------------------- */}
      {activeTab === 'requests' && (
        <>
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2>My Service Requests</h2>
              <p>Track your posted marketplace jobs and direct worker dispatches.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setActiveTab('create')}>
              <Plus size={16} /> Post New Request
            </button>
          </div>

          {/* Stats Row */}
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-card-label">Active Jobs</span>
              <span className="stat-card-value">{requests.filter(r => r.status === 'pending' || r.status === 'accepted' || r.status === 'in_progress').length}</span>
              <span className="stat-card-sub">Marketplace & Direct dispatches</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Pending Bids</span>
              <span className="stat-card-value">
                {requests.reduce((acc, r) => acc + (r.bids ? r.bids.filter(b => b.status === 'active').length : 0), 0)}
              </span>
              <span className="stat-card-sub">Offers awaiting your review</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Completed Jobs</span>
              <span className="stat-card-value">{requests.filter(r => r.status === 'completed').length}</span>
              <span className="stat-card-sub">Fulfilled contractor requests</span>
            </div>
          </div>

          {/* Section with Table */}
          <div className="section">
            <div className="section-header">
              <h3>Requests Overview</h3>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setFilterType('all')}
                >
                  All ({requests.length})
                </button>
                <button
                  className={`btn btn-sm ${filterType === 'open' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setFilterType('open')}
                >
                  Open Marketplace Ads
                </button>
                <button
                  className={`btn btn-sm ${filterType === 'direct' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setFilterType('direct')}
                >
                  Direct Dispatches
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Req ID</th>
                    <th>Job Title & Category</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Assigned Worker</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(req => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{req.id}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{req.title}</div>
                        <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{req.category} • {req.scheduled_at}</span>
                      </td>
                      <td>
                        <span className={`badge ${req.request_type === 'open' ? 'badge-blue' : 'badge-navy'}`}>
                          {req.request_type === 'open' ? 'Open Bidding' : 'Direct Dispatch'}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--gray-600)' }}>{req.location}</td>
                      <td>
                        {req.assigned_worker ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <User size={13} style={{ color: 'var(--gray-500)' }} />
                            <span style={{ fontSize: '13px', fontWeight: 500 }}>{req.assigned_worker.name}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12.5px', color: 'var(--gray-400)' }}>
                            {req.bids.length > 0 ? `${req.bids.length} bid(s) received` : 'Awaiting worker'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          req.status === 'completed' ? 'badge-green' :
                          req.status === 'in_progress' ? 'badge-blue' :
                          req.status === 'accepted' ? 'badge-navy' :
                          req.status === 'cancelled' ? 'badge-red' : 'badge-amber'
                        }`}>
                          {req.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setSelectedRequest(req)}
                          >
                            <Eye size={13} /> View
                          </button>
                          {req.assigned_worker && req.status !== 'cancelled' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setChatRequest(req)}
                              title="Chat with assigned worker"
                            >
                              <MessageSquare size={13} /> Chat
                            </button>
                          )}
                          {req.status === 'completed' && !req.review && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => setReviewModalReq(req)}
                            >
                              <Star size={13} /> Review
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* -------------------- TAB: POST A JOB -------------------- */}
      {activeTab === 'create' && (
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div className="page-header">
            <h2>Post a New Service Request</h2>
            <p>Publish an open bid ad for workers or dispatch a direct request to a specific professional.</p>
          </div>

          <div className="section" style={{ padding: '28px' }}>
            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-field">
                <label>Dispatch Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    className={`btn ${reqType === 'open' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ justifyContent: 'center', padding: '12px' }}
                    onClick={() => setReqType('open')}
                  >
                    Open Marketplace Ad (Bidding)
                  </button>
                  <button
                    type="button"
                    className={`btn ${reqType === 'direct' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ justifyContent: 'center', padding: '12px' }}
                    onClick={() => setReqType('direct')}
                  >
                    Direct Worker Hire
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label>Service Title</label>
                <input
                  type="text"
                  placeholder="e.g. Electrical Panel Repair & Inspection"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-field">
                  <label>Skill Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Electrical">Electrical Work</option>
                    <option value="Plumbing">Plumbing & Drainage</option>
                    <option value="HVAC">HVAC & Air Quality</option>
                    <option value="Carpentry">Carpentry & Structural</option>
                    <option value="Appliance Repair">Appliance Servicing</option>
                    <option value="General Maintenance">General Contracting</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Preferred Date & Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-08-19 10:00 AM"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
              </div>

              {reqType === 'direct' && (
                <div className="form-field">
                  <label>Select Worker for Direct Hire</label>
                  <select
                    value={assignedWorkerId}
                    onChange={(e) => setAssignedWorkerId(e.target.value)}
                  >
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} — {w.category} ({w.rating}★ • {w.hourly_rate})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-field">
                  <label>Site Address / Location</label>
                  <input
                    type="text"
                    placeholder="Building name, street, suite #"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Budget Estimate ($)</label>
                  <input
                    type="number"
                    placeholder="e.g. 200"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Job Description & Requirements</label>
                <textarea
                  rows={4}
                  placeholder="Provide detailed instructions regarding the fault, machinery, or site access required..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('requests')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish Service Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- TAB: WORKER DIRECTORY -------------------- */}
      {activeTab === 'workers' && (
        <>
          <div className="page-header">
            <h2>Verified Skilled Worker Directory</h2>
            <p>Find verified professionals, review their qualifications, availability schedules, and send direct job offers.</p>
          </div>

          {/* Search & Filter Bar */}
          <div className="section" style={{ padding: '16px 20px', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '16px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--gray-400)' }} />
                <input
                  type="text"
                  placeholder="Search workers by name or skill keyword (e.g. Electrician, HVAC, Jetting)..."
                  value={searchWorkerQuery}
                  onChange={(e) => setSearchWorkerQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 38px',
                    fontSize: '13.5px',
                    border: '1px solid var(--gray-300)',
                    borderRadius: 'var(--radius)',
                  }}
                />
              </div>

              <select
                value={workerCategoryFilter}
                onChange={(e) => setWorkerCategoryFilter(e.target.value)}
                style={{
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  border: '1px solid var(--gray-300)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <option value="all">All Skill Categories</option>
                <option value="Electrical">Electrical</option>
                <option value="HVAC">HVAC</option>
                <option value="Plumbing">Plumbing</option>
              </select>
            </div>
          </div>

          {/* Worker Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredWorkers.map(w => (
              <div key={w.id} className="section" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="nav-avatar" style={{ width: '42px', height: '42px', fontSize: '15px' }}>
                      {w.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)' }}>{w.name}</h3>
                        <ShieldCheck size={16} color="var(--navy)" title="Verified Professional" />
                      </div>
                      <span style={{ fontSize: '12.5px', color: 'var(--gray-500)' }}>{w.category} • {w.experience_years} yrs exp</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>{w.hourly_rate}</span>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.5 }}>{w.bio}</p>

                {/* Skill Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {w.skills.map((skill, idx) => (
                    <span key={idx} className="badge badge-gray" style={{ fontSize: '11px' }}>{skill}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--gray-100)', paddingTop: '14px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{w.rating}</span>
                    <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>({w.ratings_count})</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setSelectedWorker(w)}>
                      View Profile
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setDirectHireWorker(w);
                        setReqType('direct');
                        setAssignedWorkerId(w.id);
                        setActiveTab('create');
                      }}
                    >
                      Hire Direct
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* -------------------- MODAL: REQUEST DETAILS & BIDS -------------------- */}
      {selectedRequest && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Request Details: {selectedRequest.id}</h3>
                <span className="badge badge-blue" style={{ marginTop: '4px' }}>{selectedRequest.request_type.toUpperCase()} BIDDING</span>
              </div>
              <button className="modal-close" onClick={() => setSelectedRequest(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)' }}>{selectedRequest.title}</h4>
                <p style={{ fontSize: '13.5px', color: 'var(--gray-600)', marginTop: '4px' }}>{selectedRequest.description}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--gray-50)', padding: '12px 16px', borderRadius: 'var(--radius)' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Site Location</span>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{selectedRequest.location}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Scheduled Time</span>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{selectedRequest.scheduled_at}</div>
                </div>
              </div>

              {/* Bids Section for Open Requests */}
              {selectedRequest.request_type === 'open' && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>
                    Worker Bids Received ({selectedRequest.bids.length})
                  </h4>

                  {selectedRequest.bids.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px' }}>
                      <p>No bids submitted yet by workers.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedRequest.bids.map(bid => (
                        <div key={bid.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 600, fontSize: '14px' }}>{bid.worker_name}</span>
                              <ShieldCheck size={14} color="var(--navy)" />
                              <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>★ {bid.rating}</span>
                            </div>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy)' }}>${bid.amount.toFixed(2)}</span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--gray-600)' }}>"{bid.message}"</p>
                          {bid.status === 'active' && selectedRequest.status === 'pending' && (
                            <div style={{ marginTop: '10px', textAlign: 'right' }}>
                              <button className="btn btn-primary btn-sm" onClick={() => handleAcceptBid(selectedRequest.id, bid)}>
                                <Check size={13} /> Accept Bid & Assign
                              </button>
                            </div>
                          )}
                          {bid.status === 'accepted' && (
                            <span className="badge badge-green" style={{ marginTop: '8px' }}>Accepted Offer</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedRequest.status === 'pending' && (
                <button className="btn btn-danger btn-sm" onClick={() => handleCancelRequest(selectedRequest.id)}>
                  Cancel Request
                </button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedRequest(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: WORKER PROFILE DETAIL -------------------- */}
      {selectedWorker && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>Worker Profile Overview</h3>
              <button className="modal-close" onClick={() => setSelectedWorker(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="nav-avatar" style={{ width: '48px', height: '48px', fontSize: '16px' }}>
                  {selectedWorker.name.split(' ').map(n=>n[0]).join('')}
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700 }}>{selectedWorker.name}</h4>
                  <span style={{ fontSize: '13px', color: 'var(--navy)', fontWeight: 500 }}>{selectedWorker.category}</span>
                </div>
              </div>

              <div className="form-field">
                <label>Biography & Background</label>
                <p style={{ fontSize: '13px', color: 'var(--gray-700)', background: 'var(--gray-50)', padding: '10px', borderRadius: 'var(--radius)' }}>
                  {selectedWorker.bio}
                </p>
              </div>

              <div className="form-field">
                <label>Available Schedule Intervals</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedWorker.schedule.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 'var(--radius)', fontSize: '13px' }}>
                      <span>{s.date} • {s.time}</span>
                      <span className="badge badge-green">Available</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-field">
                <label>Verified Reviews ({selectedWorker.reviews.length})</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedWorker.reviews.map((r, i) => (
                    <div key={i} style={{ borderBottom: '1px solid var(--gray-100)', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600 }}>
                        <span>{r.user}</span>
                        <span style={{ color: '#f59e0b' }}>★ {r.rating}.0</span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'var(--gray-600)' }}>"{r.comment}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setDirectHireWorker(selectedWorker);
                  setReqType('direct');
                  setAssignedWorkerId(selectedWorker.id);
                  setSelectedWorker(null);
                  setActiveTab('create');
                }}
              >
                Dispatch Direct Job Offer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: REVIEW POSTING -------------------- */}
      {reviewModalReq && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>Rate & Review Completed Job</h3>
              <button className="modal-close" onClick={() => setReviewModalReq(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSendReview}>
              <div className="modal-body">
                <p style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                  Job: <strong>{reviewModalReq.title}</strong><br />
                  Worker: <strong>{reviewModalReq.assigned_worker?.name}</strong>
                </p>
                <div className="form-field">
                  <label>Star Rating (1 to 5)</label>
                  <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                    <option value={5}>5 Stars — Excellent Performance</option>
                    <option value={4}>4 Stars — Very Good</option>
                    <option value={3}>3 Stars — Satisfactory</option>
                    <option value={2}>2 Stars — Needs Improvement</option>
                    <option value={1}>1 Star — Unsatisfactory</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Feedback Comment</label>
                  <textarea
                    rows={3}
                    placeholder="Share your experience working with this professional..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReviewModalReq(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- CHAT DRAWER / MODAL -------------------- */}
      {chatRequest && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '14px' }}>Job Chat: {chatRequest.id}</h3>
                <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Assigned Worker: {chatRequest.assigned_worker?.name}</span>
              </div>
              <button className="modal-close" onClick={() => setChatRequest(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ height: '280px', overflowY: 'auto', background: 'var(--gray-50)', padding: '14px' }}>
              {(chatRequest.chat || []).map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    background: msg.sender === 'user' ? 'var(--navy)' : 'var(--white)',
                    color: msg.sender === 'user' ? 'var(--white)' : 'var(--gray-900)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius)',
                    fontSize: '13px',
                    boxShadow: 'var(--shadow-sm)',
                    maxWidth: '85%'
                  }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: '10.5px', color: 'var(--gray-400)', marginTop: '2px' }}>{msg.time}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendChat} style={{ display: 'flex', padding: '12px', borderTop: '1px solid var(--gray-200)', gap: '8px' }}>
              <input
                type="text"
                placeholder="Type your message..."
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', fontSize: '13px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius)' }}
              />
              <button type="submit" className="btn btn-primary btn-sm">
                <Send size={14} /> Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
