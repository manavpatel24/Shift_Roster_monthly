import React, { useState, useEffect } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO
} from 'date-fns';
import Papa from 'papaparse';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sun,
  Sunrise, Sunset, Building, Home, Plane, Loader2, Users,
  Lock, Settings, Plus, Trash2, X, Upload, Download
} from 'lucide-react';

function App() {
  const [data, setData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Admin Mode State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    employee_ids: [],
    shift_type: 'Morning',
    status: 'Office'
  });
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'upload'
  const [uploadStatus, setUploadStatus] = useState('');

  // Fetch data
  const fetchData = async () => {
    try {
      // Get employees
      const empRes = await fetch('/api/employees');
      if (empRes.ok) setEmployees(await empRes.json());
      
      // Get roster (for current month)
      const monthStr = format(currentDate, 'yyyy-MM');
      const rosRes = await fetch(`/api/roster?month=${monthStr}`);
      if (rosRes.ok) {
        const rosterData = await rosRes.json();
        // Convert dates from ISO to string standard
        const formattedData = rosterData.map(d => ({
          ...d,
          Date: d.date.split('T')[0],
          Shift: d.shift_type,
          Status: d.status,
          Name: d.name
        }));
        setData(formattedData);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]); // Refetch when month changes

  // Admin Auth
  const handleAdminAuth = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.valid) {
          setIsAdmin(true);
          setShowAdminModal(false);
          // Store password in session for subsequent requests
          sessionStorage.setItem('adminPassword', passwordInput);
        } else {
          alert('Invalid password');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  // Admin Actions
  const handleAddShift = async (e) => {
    e.preventDefault();
    if (formData.employee_ids.length === 0) {
      alert("Please select at least one employee.");
      return;
    }
    
    const adminPassword = sessionStorage.getItem('adminPassword');
    try {
      // Build an array of entries to send over the bulk API
      const entries = formData.employee_ids.map(id => ({
        employee_id: id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        shift_type: formData.shift_type,
        status: formData.status
      }));

      const res = await fetch('/api/roster/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ entries })
      });
      if (res.ok) {
        fetchData(); // Refresh panel
        setShowAddForm(false);
        setFormData({ ...formData, employee_ids: [] });
      } else {
        const error = await res.json();
        alert('Failed to add shifts: ' + error.error);
      }
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadStatus('Parsing...');
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data;
        const entries = [];
        
        // Map names to employee IDs
        for (const row of parsedData) {
          const emp = employees.find(e => e.name.toLowerCase() === row.Name?.trim().toLowerCase());
          if (emp && row.Date && row.Shift && row.Status) {
            entries.push({
              employee_id: emp.id,
              date: row.Date.trim(),
              shift_type: row.Shift.trim(),
              status: row.Status.trim()
            });
          }
        }
        
        if (entries.length === 0) {
          setUploadStatus('No valid entries found in CSV. Check column headers.');
          return;
        }

        setUploadStatus(`Uploading ${entries.length} shifts...`);
        const adminPassword = sessionStorage.getItem('adminPassword');
        try {
          const res = await fetch('/api/roster/bulk', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-password': adminPassword
            },
            body: JSON.stringify({ entries })
          });
          
          if (res.ok) {
            setUploadStatus(`Successfully added ${entries.length} shifts!`);
            fetchData();
            setTimeout(() => {
                setShowAddForm(false);
                setUploadStatus('');
            }, 2000);
          } else {
            const errData = await res.json();
            setUploadStatus('Error: ' + errData.error);
          }
        } catch (err) {
          setUploadStatus('Error uploading data.');
        }
      }
    });
  };

  const handleDeleteShift = async (id) => {
    const adminPassword = sessionStorage.getItem('adminPassword');
    try {
      const res = await fetch(`/api/roster/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword }
      });
      if (res.ok) {
        fetchData(); // Refresh
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Get data helpers
  const getDayData = (date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return data.filter(row => row.Date === formattedDate);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Calendar logic
  const nextMonth = () => setCurrentMonth(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentDate, 1));
  const onDateClick = (day) => setSelectedDate(day);

  if (isLoading) {
    return (
      <div className="loader-container">
        <Loader2 className="spinner" size={48} />
        <p>Loading roster data...</p>
      </div>
    );
  }

  // Group daily roster data
  const selectedDayData = getDayData(selectedDate);
  const shifts = {
    Morning: selectedDayData.filter(d => d.Shift === 'Morning'),
    Normal: selectedDayData.filter(d => d.Shift === 'Normal'),
    Noon: selectedDayData.filter(d => d.Shift === 'Noon'),
    'Extra Day': selectedDayData.filter(d => d.Shift === 'Extra Day'),
    Leave: selectedDayData.filter(d => d.Status === 'Leave' || d.Shift === '-') // handle both
  };

  const shiftIcons = {
    Morning: <Sunrise size={18} color="var(--shift-morning)" />,
    Normal: <Sun size={18} color="var(--shift-normal)" />,
    Noon: <Sunset size={18} color="var(--shift-noon)" />,
    'Extra Day': <Plus size={18} color="var(--shift-extra)" />,
    Leave: <Plane size={18} color="var(--status-leave)" />
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Office': return <Building size={12} />;
      case 'Home': return <Home size={12} />;
      case 'Leave': return <Plane size={12} />;
      default: return null;
    }
  };

  const handleDownloadCSV = () => {
    // Map current active month's data into clean CSV export
    const exportData = data.map(d => ({
      Name: d.Name,
      'Job Title': d.job_title,
      Date: d.Date,
      Day: format(parseISO(d.Date), 'EEEE'),
      Shift: d.Shift
    }));
    
    if (exportData.length === 0) {
      alert("No data to download for this month.");
      return;
    }

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `roster_${format(currentDate, 'yyyy_MM')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // UI Renders
  const renderDays = () => {
    const days = [];
    let startDate = startOfWeek(currentDate);
    for (let i = 0; i < 7; i++) {
        days.push(
            <div className="calendar-day-header" key={i}>
                {format(addDays(startDate, i), "EEE")}
            </div>
        );
    }
    return <div className="calendar-grid" style={{marginBottom: '0.5rem'}}>{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayShifts = getDayData(cloneDay);
        const uniqueShifts = [...new Set(dayShifts.map(s => s.Shift).filter(s => s && s !== '-'))];

        days.push(
          <div
            className={`calendar-cell ${!isSameMonth(day, monthStart) ? "empty" : isSameDay(day, selectedDate) ? "active" : ""}`}
            key={day}
            onClick={() => onDateClick(cloneDay)}
          >
            <span className={`day-number ${isSameDay(day, new Date()) ? "today" : ""}`}>
              {format(day, "d")}
            </span>
            <div className="shift-indicators">
                {uniqueShifts.map((shift, idx) => {
                  const shiftClass = shift.replace(/\s+/g, '');
                  return <div key={idx} className={`shift-dot ${shiftClass}`} title={shift} />
                })}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="calendar-grid" style={{marginBottom: '0.5rem'}} key={day}>{days}</div>);
      days = [];
    }
    return <div>{rows}</div>;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title">
          <CalendarIcon className="icon" size={28} />
          Support Department Roster
        </div>
        <button 
          className={`admin-btn ${isAdmin ? 'active' : ''}`}
          onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminModal(true)}
        >
          <Settings size={18} />
          {isAdmin ? 'Exit Admin Mode' : 'Admin'}
        </button>
      </header>

      {/* Admin Auth Modal */}
      {showAdminModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3><Lock size={20} /> Admin Access</h3>
              <button onClick={() => setShowAdminModal(false)} className="close-btn"><X size={20} /></button>
            </div>
            <form onSubmit={handleAdminAuth}>
              <div className="form-group">
                <label>Admin Password</label>
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="primary-btn">Authenticate</button>
            </form>
          </div>
        </div>
      )}

      <main className="app-main">
        <section className="calendar-section">
            <div className="calendar-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                  onClick={handleDownloadCSV} 
                  className="icon-btn primary" 
                  title="Download Month Data"
                  style={{ display: 'inline-flex', padding: '0.4rem 0.75rem', gap: '0.5rem', fontSize: '0.875rem' }}
                >
                  <Download size={16} /> Export CSV
                </button>
                <div className="calendar-nav">
                  <button onClick={prevMonth}><ChevronLeft size={20} /></button>
                  <button onClick={nextMonth}><ChevronRight size={20} /></button>
                </div>
              </div>
            </div>
            {renderDays()}
            {renderCells()}
            
            <div className="legend-container">
               <div className="legend-item"><div className="shift-dot Morning"></div> Morning Shift</div>
               <div className="legend-item"><div className="shift-dot Normal"></div> Normal Shift</div>
               <div className="legend-item"><div className="shift-dot Noon"></div> Noon Shift</div>
               <div className="legend-item"><div className="shift-dot ExtraDay"></div> Extra Day</div>
            </div>
        </section>

        <section className="roster-panel">
          <div className="roster-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="roster-date">{format(selectedDate, 'EEEE, MMMM do yyyy')}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {selectedDayData.length} team members scheduled
              </div>
            </div>
            
            {isAdmin && (
              <button className="icon-btn primary" onClick={() => setShowAddForm(!showAddForm)}>
                {showAddForm ? <X size={20} /> : <Plus size={20} />}
              </button>
            )}
          </div>

          <div className="roster-content">
            {/* Admin Add Shift Form */}
            {isAdmin && showAddForm && (
              <div className="admin-form-panel">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                   <button 
                     className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
                     onClick={() => setActiveTab('manual')}
                   >Manual Entry</button>
                   <button 
                     className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                     onClick={() => setActiveTab('upload')}
                   >CSV Upload</button>
                </div>

                {activeTab === 'manual' ? (
                  <>
                    <h4>Assign Shift(s) for {format(selectedDate, 'MMM do')}</h4>
                    <form onSubmit={handleAddShift}>
                      <div className="form-group">
                         <label>Select Employee(s)</label>
                         <div className="multi-select-container">
                           {employees.map(emp => (
                             <label key={emp.id} className="checkbox-label">
                               <input 
                                 type="checkbox"
                                 checked={formData.employee_ids.includes(emp.id)}
                                 onChange={(e) => {
                                   if (e.target.checked) {
                                     setFormData({...formData, employee_ids: [...formData.employee_ids, emp.id]});
                                   } else {
                                     setFormData({...formData, employee_ids: formData.employee_ids.filter(id => id !== emp.id)});
                                   }
                                 }}
                               />
                               {emp.name}
                             </label>
                           ))}
                         </div>
                      </div>
                      <div className="form-group">
                         <label>Shift Type</label>
                         <select
                           value={formData.shift_type}
                           onChange={e => setFormData({...formData, shift_type: e.target.value})}
                         >
                           <option value="Morning">Morning</option>
                           <option value="Normal">Normal</option>
                           <option value="Noon">Noon</option>
                           <option value="Extra Day">Extra Day</option>
                           <option value="-">- (None/Leave)</option>
                         </select>
                      </div>
                      <div className="form-group">
                         <label>Status</label>
                         <select
                           value={formData.status}
                           onChange={e => setFormData({...formData, status: e.target.value})}
                         >
                           <option value="Office">Office</option>
                           <option value="Home">Home</option>
                           <option value="Leave">Leave</option>
                         </select>
                      </div>
                      <button type="submit" className="primary-btn full-width">Assign Shift</button>
                    </form>
                  </>
                ) : (
                  <>
                    <h4>Bulk Upload CSV</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Upload a CSV file with columns: <strong>Name, Date, Shift, Status</strong>.
                      Date must be YYYY-MM-DD.
                    </p>
                    <div className="form-group">
                      <label className="upload-dropzone">
                         <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
                         <Upload size={32} color="var(--accent-primary)" />
                         <span style={{ marginTop: '0.5rem', fontWeight: '500' }}>Click to select CSV</span>
                      </label>
                    </div>
                    {uploadStatus && (
                      <div style={{ padding: '0.75rem', backgroundColor: '#eef2ff', color: 'var(--accent-primary)', borderRadius: '8px', fontSize: '0.875rem', marginTop: '1rem', textAlign: 'center' }}>
                        {uploadStatus}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {selectedDayData.length === 0 && !showAddForm ? (
              <div className="empty-state">
                <Users size={48} className="empty-state-icon" />
                <p>No shifts scheduled for this date.</p>
              </div>
            ) : (
              <>
                {['Morning', 'Normal', 'Noon', 'Extra Day', 'Leave'].map(shiftType => {
                  if (shifts[shiftType].length === 0) return null;
                  
                  return (
                    <div className="shift-group" key={shiftType}>
                      <div className="shift-group-title">
                        {shiftIcons[shiftType]}
                        {shiftType === 'Leave' ? 'On Leave' : `${shiftType} Shift`}
                        <span style={{marginLeft: 'auto', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '12px'}}>
                          {shifts[shiftType].length}
                        </span>
                      </div>
                      
                      {shifts[shiftType].map((person, i) => (
                        <div className="employee-card" key={person.id || i}>
                          <div className="employee-info">
                            <div className="employee-avatar">
                              {getInitials(person.Name)}
                            </div>
                            <div>
                              <div className="employee-name">{person.Name}</div>
                              {isAdmin && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {person.employee_id}</div>}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <div className={`status-badge ${person.Status}`}>
                              {getStatusIcon(person.Status)}
                              {person.Status}
                            </div>
                            {isAdmin && (
                              <button 
                                className="icon-btn danger" 
                                onClick={() => handleDeleteShift(person.id)}
                                title="Delete Shift"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
