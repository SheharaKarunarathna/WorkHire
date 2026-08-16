import React, { useState } from 'react';
import {
  Wrench, Star, ShieldCheck, DollarSign, CheckCircle2, Clock,
  MapPin, Send, AlertCircle, Calendar, Plus, Trash2, Check, X,
  FileText, MessageSquare, User, Eye, Edit3, Search
} from 'lucide-react';

export default function WorkerDashboard({ activeTab, setActiveTab }) {
  // Ensure active tab fallback for worker dashboard
  const validTabs = ['marketplace', 'incoming', 'my-bids', 'schedule', 'profile'];
  const currentTab = validTabs.includes(activeTab) ? activeTab : 'marketplace';

  // Duty Availability Toggle State
  const [availability, setAvailability] = useState(true);

  // Worker Profile State representing GET /workers/profile/me
  const [profile, setProfile] = useState({
    id: 'worker-4422',
    name: 'David Vance',
    email: 'david.vance@workhire.com',
    category: 'Electrical & HVAC',
    hourly_rate: '$65/hr',
    experience_years: 9,
    verification_status: 'verified',
    rating: 4.95,
    ratings_count: 38,
    skills: ['Electrical Wiring', 'Circuit Breakers', 'HVAC Repair', 'Generator Diagnostics'],
    bio: 'Master Electrician and certified HVAC technician with 9+ years of commercial contract experience.',
  });

  // Mock Marketplace Open Requests representing GET /requests/open
  const [openMarketplace, setOpenMarketplace] = useState([
    {
      id: 'REQ-901',
      title: 'Commercial HVAC System Maintenance & Filter Swap',
      category: 'HVAC',
      location: 'Enterprise Tower, Suite 400',
      description: 'Quarterly inspection and high-efficiency air filter replacement for 3 roof HVAC units.',
      scheduled_at: '2026-08-18 09:00 AM',
      created_at: '10m ago',
      bids_count: 2,
    },
    {
      id: 'REQ-904',
      title: 'Emergency Generator Panel Diagnostic & Wiring Check',
      category: 'Electrical',
      location: '772 Industrial Complex',
      description: 'Backup generator panel fail-safe testing and relay wiring inspection.',
      scheduled_at: '2026-08-19 11:00 AM',
      created_at: '45m ago',
      bids_count: 0,
    },
    {
      id: 'REQ-905',
      title: 'Commercial Plumbing Main Sewer Line Snake',
      category: 'Plumbing',
      location: 'Harbor Warehouse #4',
      description: 'Clear grease clog in commercial kitchen main drain line using high-pressure hydro-jet.',
      scheduled_at: '2026-08-20 08:30 AM',
      created_at: '2h ago',
      bids_count: 4,
    }
  ]);

  // Mock Direct Incoming Requests representing GET /requests/direct/incoming
  const [directIncoming, setDirectIncoming] = useState([
    {
      id: 'REQ-902',
      requester_name: 'Samantha Wright',
      requester_company: 'Commercial Logistics Inc',
      title: 'Direct Repair: Main Circuit Breaker Tripping',
      category: 'Electrical',
      location: '124 Industrial Parkway',
      description: 'Urgent main electrical panel diagnosis and breaker replacement.',
      budget: '$250.00',
      status: 'in_progress', // 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected'
      scheduled_at: '2026-08-16 02:00 PM',
      created_at: '1h ago',
      chat: [
        { sender: 'worker', text: 'Hello Samantha! I have arrived at the Industrial Parkway site.', time: '02:30 PM' },
        { sender: 'user', text: 'Great! The panel box is located in basement room B-2.', time: '02:32 PM' },
      ]
    }
  ]);

  // Mock Worker Bids representing GET /bids/my-bids
  const [myBids, setMyBids] = useState([
    {
      id: 'BID-101',
      request_id: 'REQ-901',
      request_title: 'Commercial HVAC System Maintenance & Filter Swap',
      amount: 140.00,
      message: 'Certified HVAC engineer available tomorrow morning at 8:00 AM.',
      status: 'active', // 'active' | 'accepted' | 'rejected' | 'withdrawn'
      created_at: '2026-08-16 11:00 AM'
    }
  ]);

  // Mock Schedule Intervals representing GET /schedules/me
  const [schedules, setSchedules] = useState([
    { id: 'SLOT-1', date: '2026-08-17', start: '08:00 AM', end: '12:00 PM', is_booked: false },
    { id: 'SLOT-2', date: '2026-08-17', start: '01:00 PM', end: '05:00 PM', is_booked: true, booked_by: 'REQ-902' },
    { id: 'SLOT-3', date: '2026-08-18', start: '09:00 AM', end: '01:00 PM', is_booked: false },
  ]);

  // UI Modal States
  const [biddingRequest, setBiddingRequest] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidProposal, setBidProposal] = useState('');

  // Schedule Modal State
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotStart, setNewSlotStart] = useState('09:00 AM');
  const [newSlotEnd, setNewSlotEnd] = useState('01:00 PM');

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editRate, setEditRate] = useState(profile.hourly_rate);
  const [editBio, setEditBio] = useState(profile.bio);

  // Active Job Chat State
  const [chatRequest, setChatRequest] = useState(null);
  const [chatText, setChatText] = useState('');

  // Search & Filter State
  const [searchMarketQuery, setSearchMarketQuery] = useState('');

  // Handlers
  const handlePlaceBid = (e) => {
    e.preventDefault();
    if (!bidAmount || !biddingRequest) return;

    if (profile.verification_status !== 'verified') {
      alert('Verification required: Only verified workers can submit bids on marketplace requests.');
      return;
    }

    const newBid = {
      id: `BID-${Math.floor(200 + Math.random() * 800)}`,
      request_id: biddingRequest.id,
      request_title: biddingRequest.title,
      amount: parseFloat(bidAmount),
      message: bidProposal || 'Standard contract rate with guaranteed service turnaround.',
      status: 'active',
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMyBids([newBid, ...myBids]);
    setOpenMarketplace(openMarketplace.map(req => req.id === biddingRequest.id ? { ...req, bids_count: req.bids_count + 1 } : req));
    setBiddingRequest(null);
    setBidAmount('');
    setBidProposal('');
    alert(`Bid of $${bidAmount} successfully submitted!`);
  };

  const handleWithdrawBid = (bidId) => {
    setMyBids(myBids.map(b => b.id === bidId ? { ...b, status: 'withdrawn' } : b));
  };

  const handleRespondDirect = (requestId, action) => {
    setDirectIncoming(directIncoming.map(req => {
      if (req.id === requestId) {
        return { ...req, status: action === 'accept' ? 'accepted' : 'rejected' };
      }
      return req;
    }));
  };

  const handleUpdateJobStatus = (requestId, newStatus) => {
    setDirectIncoming(directIncoming.map(req => req.id === requestId ? { ...req, status: newStatus } : req));
  };

  const handleAddScheduleSlot = (e) => {
    e.preventDefault();
    if (!newSlotDate) return;

    if (profile.verification_status !== 'verified') {
      alert('Only verified workers can create schedule slots.');
      return;
    }

    const slot = {
      id: `SLOT-${Math.floor(100 + Math.random() * 900)}`,
      date: newSlotDate,
      start: newSlotStart,
      end: newSlotEnd,
      is_booked: false
    };
    setSchedules([...schedules, slot]);
    setNewSlotDate('');
  };

  const handleDeleteSlot = (slotId) => {
    setSchedules(schedules.filter(s => s.id !== slotId));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfile({
      ...profile,
      hourly_rate: editRate,
      bio: editBio
    });
    setIsEditingProfile(false);
  };

  const handleToggleVerification = () => {
    const nextStatus = profile.verification_status === 'verified' ? 'unverified' : 'verified';
    setProfile({ ...profile, verification_status: nextStatus });
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatText.trim() || !chatRequest) return;
    const msg = { sender: 'worker', text: chatText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const updated = { ...chatRequest, chat: [...(chatRequest.chat || []), msg] };
    setChatRequest(updated);
    setDirectIncoming(directIncoming.map(r => r.id === chatRequest.id ? updated : r));
    setChatText('');
  };

  const filteredMarketplace = openMarketplace.filter(m =>
    m.title.toLowerCase().includes(searchMarketQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchMarketQuery.toLowerCase()) ||
    m.location.toLowerCase().includes(searchMarketQuery.toLowerCase())
  );

  return (
    <div className="dashboard-content">
      {/* Worker Banner Section */}
      <div className="section" style={{ padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="nav-avatar" style={{ width: '52px', height: '52px', fontSize: '18px', background: 'var(--navy)' }}>
            {profile.name.split(' ').map(n=>n[0]).join('')}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gray-900)' }}>{profile.name}</h2>
              {profile.verification_status === 'verified' ? (
                <span className="badge badge-navy" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} color="var(--navy)" /> Verified Contractor
                </span>
              ) : (
                <span className="badge badge-amber">Verification Pending</span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>
              {profile.category} • {profile.hourly_rate} • {profile.experience_years} Years Exp
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '12px', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duty Availability</span>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: availability ? '#16a34a' : '#dc2626' }}>
              {availability ? '🟢 Active & Accepting Jobs' : '🔴 Offline / Busy'}
            </div>
          </div>
          <button
            className={`btn ${availability ? 'btn-outline' : 'btn-primary'} btn-sm`}
            onClick={() => setAvailability(!availability)}
          >
            {availability ? 'Set Offline' : 'Set Available'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-card-label">Rating & Reputation</span>
          <span className="stat-card-value">★ {profile.rating}</span>
          <span className="stat-card-sub">Based on {profile.ratings_count} verified reviews</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">My Active Bids</span>
          <span className="stat-card-value">{myBids.filter(b => b.status === 'active').length}</span>
          <span className="stat-card-sub">Proposals submitted to marketplace</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Direct Job Offers</span>
          <span className="stat-card-value">{directIncoming.filter(d => d.status === 'pending' || d.status === 'accepted' || d.status === 'in_progress').length}</span>
          <span className="stat-card-sub">Client direct requests</span>
        </div>
      </div>

      {/* -------------------- TAB: MARKETPLACE JOBS -------------------- */}
      {currentTab === 'marketplace' && (
        <>
          <div className="page-header">
            <h2>Open Marketplace Requests</h2>
            <p>Browse open job requests posted by clients seeking bids from verified professionals.</p>
          </div>

          <div className="section" style={{ padding: '16px 20px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--gray-400)' }} />
              <input
                type="text"
                placeholder="Search marketplace requests by title, category, or location..."
                value={searchMarketQuery}
                onChange={(e) => setSearchMarketQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 38px',
                  fontSize: '13.5px',
                  border: '1px solid var(--gray-300)',
                  borderRadius: 'var(--radius)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredMarketplace.map(item => (
              <div key={item.id} className="section" style={{ padding: '20px', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '13px' }}>{item.id}</span>
                      <span className="badge badge-blue">{item.category}</span>
                      <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>Posted {item.created_at}</span>
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '6px' }}>{item.title}</h3>
                    <p style={{ fontSize: '13.5px', color: 'var(--gray-600)', marginBottom: '10px' }}>{item.description}</p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', color: 'var(--gray-500)' }}>
                      <span>📍 {item.location}</span>
                      <span>📅 {item.scheduled_at}</span>
                      <span>💬 {item.bids_count} bid(s) placed</span>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={() => setBiddingRequest(item)}
                  >
                    Submit Bid Proposal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* -------------------- TAB: DIRECT REQUESTS -------------------- */}
      {currentTab === 'incoming' && (
        <>
          <div className="page-header">
            <h2>Direct Hire Job Requests</h2>
            <p>Review direct job dispatches sent specifically to you by client requesters.</p>
          </div>

          <div className="section">
            <div className="section-header">
              <h3>Incoming Direct Offers</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Req ID</th>
                    <th>Requester Client</th>
                    <th>Job Title & Category</th>
                    <th>Location & Time</th>
                    <th>Budget Offer</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {directIncoming.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{item.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.requester_name}</div>
                        <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{item.requester_company}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        <span className="badge badge-gray" style={{ fontSize: '11px' }}>{item.category}</span>
                      </td>
                      <td style={{ fontSize: '12.5px' }}>
                        <div>{item.location}</div>
                        <span style={{ color: 'var(--gray-400)' }}>{item.scheduled_at}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{item.budget || 'Open'}</td>
                      <td>
                        <span className={`badge ${
                          item.status === 'completed' ? 'badge-green' :
                          item.status === 'in_progress' ? 'badge-blue' :
                          item.status === 'accepted' ? 'badge-navy' :
                          item.status === 'rejected' ? 'badge-red' : 'badge-amber'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {item.status === 'pending' && (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => handleRespondDirect(item.id, 'accept')}>
                                Accept Offer
                              </button>
                              <button className="btn btn-outline btn-sm" onClick={() => handleRespondDirect(item.id, 'reject')}>
                                Reject
                              </button>
                            </>
                          )}
                          {(item.status === 'accepted' || item.status === 'in_progress') && (
                            <>
                              {item.status === 'accepted' && (
                                <button className="btn btn-primary btn-sm" onClick={() => handleUpdateJobStatus(item.id, 'in_progress')}>
                                  Start Job
                                </button>
                              )}
                              {item.status === 'in_progress' && (
                                <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateJobStatus(item.id, 'completed')}>
                                  <CheckCircle2 size={13} /> Mark Completed
                                </button>
                              )}
                              <button className="btn btn-outline btn-sm" onClick={() => setChatRequest(item)}>
                                <MessageSquare size={13} /> Chat
                              </button>
                            </>
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

      {/* -------------------- TAB: MY BIDS -------------------- */}
      {currentTab === 'my-bids' && (
        <>
          <div className="page-header">
            <h2>My Active Proposals & Bids</h2>
            <p>Track all bids submitted to open marketplace job postings.</p>
          </div>

          <div className="section">
            <div className="section-header">
              <h3>Submitted Bids Log</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bid ID</th>
                    <th>Target Request Title</th>
                    <th>Bid Amount</th>
                    <th>Proposal Note</th>
                    <th>Submitted At</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myBids.map(bid => (
                    <tr key={bid.id}>
                      <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{bid.id}</td>
                      <td style={{ fontWeight: 600 }}>{bid.request_title}</td>
                      <td style={{ fontWeight: 700, color: 'var(--navy)' }}>${bid.amount.toFixed(2)}</td>
                      <td style={{ fontSize: '13px', color: 'var(--gray-600)', maxWidth: '240px' }}>"{bid.message}"</td>
                      <td style={{ fontSize: '12.5px', color: 'var(--gray-400)' }}>{bid.created_at}</td>
                      <td>
                        <span className={`badge ${
                          bid.status === 'accepted' ? 'badge-green' :
                          bid.status === 'withdrawn' ? 'badge-gray' :
                          bid.status === 'rejected' ? 'badge-red' : 'badge-blue'
                        }`}>
                          {bid.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {bid.status === 'active' && (
                          <button className="btn btn-outline btn-sm" onClick={() => handleWithdrawBid(bid.id)}>
                            Withdraw Bid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* -------------------- TAB: SCHEDULE -------------------- */}
      {currentTab === 'schedule' && (
        <>
          <div className="page-header">
            <h2>My Available Work Schedule</h2>
            <p>Manage your availability intervals for direct hires and scheduled marketplace dispatches.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
            {/* Left: Schedule Table */}
            <div className="section">
              <div className="section-header">
                <h3>Current Availability Slots</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Slot ID</th>
                      <th>Date</th>
                      <th>Time Interval</th>
                      <th>Booking Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map(slot => (
                      <tr key={slot.id}>
                        <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{slot.id}</td>
                        <td style={{ fontWeight: 500 }}>{slot.date}</td>
                        <td>{slot.start} - {slot.end}</td>
                        <td>
                          {slot.is_booked ? (
                            <span className="badge badge-amber">Booked ({slot.booked_by})</span>
                          ) : (
                            <span className="badge badge-green">Available</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {!slot.is_booked && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSlot(slot.id)}>
                              <Trash2 size={13} /> Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Add Slot Form */}
            <div className="section" style={{ padding: '20px', height: 'fit-content' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>Add New Schedule Interval</h3>
              <form onSubmit={handleAddScheduleSlot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-field">
                  <label>Select Date</label>
                  <input
                    type="date"
                    value={newSlotDate}
                    onChange={(e) => setNewSlotDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Start Time</label>
                  <input
                    type="text"
                    value={newSlotStart}
                    onChange={(e) => setNewSlotStart(e.target.value)}
                    placeholder="e.g. 09:00 AM"
                    required
                  />
                </div>

                <div className="form-field">
                  <label>End Time</label>
                  <input
                    type="text"
                    value={newSlotEnd}
                    onChange={(e) => setNewSlotEnd(e.target.value)}
                    placeholder="e.g. 01:00 PM"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }}>
                  <Plus size={15} /> Add Interval Slot
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* -------------------- TAB: WORKER PROFILE & VERIFICATION -------------------- */}
      {currentTab === 'profile' && (
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>Worker Profile & Verification Status</h2>
              <p>Update your trade qualifications, hourly rate, and verification badge status.</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={handleToggleVerification}>
              Toggle Verification Status (Demo)
            </button>
          </div>

          <div className="section" style={{ padding: '28px' }}>
            {!isEditingProfile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="nav-avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>DV</div>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: 700 }}>{profile.name}</h3>
                      <span style={{ fontSize: '13px', color: 'var(--navy)', fontWeight: 500 }}>{profile.category}</span>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setIsEditingProfile(true)}>
                    <Edit3 size={14} /> Edit Profile
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'var(--gray-50)', padding: '14px', borderRadius: 'var(--radius)' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Hourly Rate</span>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>{profile.hourly_rate}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Experience</span>
                    <div style={{ fontSize: '15px', fontWeight: 700 }}>{profile.experience_years} Years</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Status</span>
                    <div>
                      {profile.verification_status === 'verified' ? (
                        <span className="badge badge-navy">VERIFIED</span>
                      ) : (
                        <span className="badge badge-amber">UNVERIFIED</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '6px' }}>Skills & Certifications</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {profile.skills.map((s, idx) => (
                      <span key={idx} className="badge badge-gray">{s}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '6px' }}>Bio & Background</h4>
                  <p style={{ fontSize: '13.5px', color: 'var(--gray-700)', lineHeight: 1.6 }}>{profile.bio}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-field">
                  <label>Contract Hourly Rate ($)</label>
                  <input
                    type="text"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Professional Bio</label>
                  <textarea
                    rows={4}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Profile Changes</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* -------------------- MODAL: BID PLACEMENT FORM -------------------- */}
      {biddingRequest && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Submit Bid Proposal</h3>
              <button className="modal-close" onClick={() => setBiddingRequest(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePlaceBid}>
              <div className="modal-body">
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--navy)', fontWeight: 600 }}>{biddingRequest.id}</span>
                  <h4 style={{ fontSize: '15px', fontWeight: 700 }}>{biddingRequest.title}</h4>
                </div>

                <div className="form-field">
                  <label>Your Proposed Bid Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 140.00"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Proposal Message & Availability Details</label>
                  <textarea
                    rows={3}
                    placeholder="Explain your approach, equipment, and confirmation of start time..."
                    value={bidProposal}
                    onChange={(e) => setBidProposal(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setBiddingRequest(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Submit Proposal Bid</button>
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
                <h3 style={{ fontSize: '14px' }}>Client Chat: {chatRequest.id}</h3>
                <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Client: {chatRequest.requester_name}</span>
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
                  alignItems: msg.sender === 'worker' ? 'flex-end' : 'flex-start',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    background: msg.sender === 'worker' ? 'var(--navy)' : 'var(--white)',
                    color: msg.sender === 'worker' ? 'var(--white)' : 'var(--gray-900)',
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
                placeholder="Type your message to client..."
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
