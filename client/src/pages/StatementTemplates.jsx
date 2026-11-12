import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import localDB from '../services/db';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Star,
  StarOff,
  X,
  Eye,
  Settings,
  ChevronRight,
  ChevronDown,
  FolderOpen
} from 'lucide-react';

const StatementTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    columns: true,
    display: true,
    layout: false
  });

  // Form state
  const [formData, setFormData] = useState({
    templateName: '',
    statementType: 'TA',
    selectedColumns: [],
    columnOrder: [],
    groupByCategory: false,
    groupByTrain: false,
    showEmployeeInfo: true,
    showSignatureSection: true,
    showSummaryTotals: true,
    showRemarks: true,
    pageOrientation: 'portrait',
    fontSize: 'medium',
    customHeader: '',
    customFooter: '',
    isDefault: false
  });

  // Available columns per statement type
  const availableColumnsByType = {
    TA: [
      { id: 'date', label: 'Date' },
      { id: 'trainNumber', label: 'Train Number' },
      { id: 'trainName', label: 'Train Name' },
      { id: 'route', label: 'Route (From-To)' },
      { id: 'departureFromHq', label: 'Departure from HQ' },
      { id: 'arrivalAtHq', label: 'Arrival at HQ' },
      { id: 'taAmount', label: 'TA Amount (₹)' },
      { id: 'dutyCategory', label: 'Duty Category' },
      { id: 'remarks', label: 'Remarks' }
    ],
    NDA: [
      { id: 'date', label: 'Date' },
      { id: 'trainNumber', label: 'Train Number' },
      { id: 'trainName', label: 'Train Name' },
      { id: 'route', label: 'Route (From-To)' },
      { id: 'actualDeparture', label: 'Actual Departure' },
      { id: 'actualArrival', label: 'Actual Arrival' },
      { id: 'nightDutyHours', label: 'Night Duty Hours' },
      { id: 'ndaAmount', label: 'NDA Amount (₹)' },
      { id: 'dutyCategory', label: 'Duty Category' },
      { id: 'remarks', label: 'Remarks' }
    ],
    MR: [
      { id: 'date', label: 'Date' },
      { id: 'trainNumber', label: 'Train Number' },
      { id: 'trainName', label: 'Train Name' },
      { id: 'route', label: 'Route (From-To)' },
      { id: 'mrNumber', label: 'MR Number' },
      { id: 'mrAmount', label: 'MR Amount (₹)' },
      { id: 'remittedAtStation', label: 'Remitted At Station' },
      { id: 'claimStatus', label: 'Claim Status' }
    ],
    DIARY: [
      { id: 'date', label: 'Date' },
      { id: 'trainNumber', label: 'Train Number' },
      { id: 'trainName', label: 'Train Name' },
      { id: 'route', label: 'Route (From-To)' },
      { id: 'distance', label: 'Distance (km)' },
      { id: 'scheduledDeparture', label: 'Scheduled Departure' },
      { id: 'actualDeparture', label: 'Actual Departure' },
      { id: 'delay', label: 'Delay (min)' },
      { id: 'dutyCategory', label: 'Duty Category' },
      { id: 'taAmount', label: 'TA (₹)' },
      { id: 'ndaAmount', label: 'NDA (₹)' },
      { id: 'nightDutyHours', label: 'Night Hours' },
      { id: 'remarks', label: 'Remarks' }
    ],
    COMBINED: [
      { id: 'date', label: 'Date' },
      { id: 'trainNumber', label: 'Train Number' },
      { id: 'trainName', label: 'Train Name' },
      { id: 'route', label: 'Route (From-To)' },
      { id: 'distance', label: 'Distance (km)' },
      { id: 'nightDutyHours', label: 'Night Hours' },
      { id: 'taAmount', label: 'TA (₹)' },
      { id: 'ndaAmount', label: 'NDA (₹)' },
      { id: 'totalAllowance', label: 'Total Allowance (₹)' },
      { id: 'dutyCategory', label: 'Duty Category' }
    ]
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.statementTemplates.getAll();
      setTemplates(response);

      // Cache in IndexedDB
      const db = await localDB.init();
      for (const template of response) {
        await db.put('statementTemplates', { ...template, localId: template._id || template.localId });
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      
      // Fallback to offline data
      try {
        const db = await localDB.init();
        const offlineTemplates = await db.getAll('statementTemplates');
        setTemplates(offlineTemplates);
      } catch (dbErr) {
        console.error('Failed to load offline templates:', dbErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    const defaultColumns = availableColumnsByType[formData.statementType].map(col => col.id);
    setFormData({
      templateName: '',
      statementType: 'TA',
      selectedColumns: defaultColumns,
      columnOrder: defaultColumns,
      groupByCategory: false,
      groupByTrain: false,
      showEmployeeInfo: true,
      showSignatureSection: true,
      showSummaryTotals: true,
      showRemarks: true,
      pageOrientation: 'portrait',
      fontSize: 'medium',
      customHeader: '',
      customFooter: '',
      isDefault: false
    });
    setShowForm(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setFormData({
      templateName: template.templateName,
      statementType: template.statementType,
      selectedColumns: template.selectedColumns || [],
      columnOrder: template.columnOrder || [],
      groupByCategory: template.groupByCategory || false,
      groupByTrain: template.groupByTrain || false,
      showEmployeeInfo: template.showEmployeeInfo !== false,
      showSignatureSection: template.showSignatureSection !== false,
      showSummaryTotals: template.showSummaryTotals !== false,
      showRemarks: template.showRemarks !== false,
      pageOrientation: template.pageOrientation || 'portrait',
      fontSize: template.fontSize || 'medium',
      customHeader: template.customHeader || '',
      customFooter: template.customFooter || '',
      isDefault: template.isDefault || false
    });
    setShowForm(true);
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await api.statementTemplates.delete(id);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      alert('Failed to delete template: ' + err.message);
    }
  };

  const handleDuplicateTemplate = async (id) => {
    try {
      await api.statementTemplates.duplicate(id);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to duplicate template:', err);
      alert('Failed to duplicate template: ' + err.message);
    }
  };

  const handleToggleDefault = async (template) => {
    try {
      await api.statementTemplates.update(template._id, {
        ...template,
        isDefault: !template.isDefault
      });
      fetchTemplates();
    } catch (err) {
      console.error('Failed to update template:', err);
      alert('Failed to update template: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData
      };

      if (editingTemplate) {
        await api.statementTemplates.update(editingTemplate._id, payload);
      } else {
        await api.statementTemplates.create(payload);
      }

      setShowForm(false);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to save template:', err);
      alert('Failed to save template: ' + err.message);
    }
  };

  const handleStatementTypeChange = (type) => {
    const defaultColumns = availableColumnsByType[type].map(col => col.id);
    setFormData({
      ...formData,
      statementType: type,
      selectedColumns: defaultColumns,
      columnOrder: defaultColumns
    });
  };

  const handleColumnToggle = (columnId) => {
    const newSelectedColumns = formData.selectedColumns.includes(columnId)
      ? formData.selectedColumns.filter(c => c !== columnId)
      : [...formData.selectedColumns, columnId];
    
    const newColumnOrder = availableColumnsByType[formData.statementType]
      .map(col => col.id)
      .filter(id => newSelectedColumns.includes(id));

    setFormData({
      ...formData,
      selectedColumns: newSelectedColumns,
      columnOrder: newColumnOrder
    });
  };

  const handleViewTemplate = (template) => {
    setViewingTemplate(template);
  };

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  const statementTypes = [
    { value: 'TA', label: 'Traveling Allowance (TA)' },
    { value: 'NDA', label: 'Night Duty Allowance (NDA)' },
    { value: 'MR', label: 'Money Remittance (MR)' },
    { value: 'DIARY', label: 'Monthly Diary (Full Log)' },
    { value: 'COMBINED', label: 'Combined TA + NDA' }
  ];

  return (
    <div className="app-container">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-white mb-1">Statement Templates</h2>
          <p className="text-secondary-custom mb-0">Create and manage custom report templates for your statements</p>
        </div>
        <button onClick={handleAddTemplate} className="btn btn-glow-primary d-flex align-items-center gap-2">
          <Plus size={16} />
          <span>Create Template</span>
        </button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="card-saas text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p className="text-secondary-custom">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="card-saas text-center py-5">
          <FolderOpen size={48} className="text-secondary-custom mb-3" />
          <h6 className="text-white mb-1">No Templates Yet</h6>
          <p className="text-secondary-custom small mb-3">Create your first statement template to get started.</p>
          <button onClick={handleAddTemplate} className="btn btn-glow-primary btn-sm">
            <Plus size={14} className="me-1" />
            Create Template
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {templates.map(template => (
            <div key={template._id} className="col-12 col-md-6 col-lg-4">
              <div className="card-saas h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="flex-grow-1">
                    <h6 className="text-white mb-1 d-flex align-items-center gap-2">
                      {template.templateName}
                      {template.isDefault && (
                        <span className="badge bg-warning-subtle text-warning" style={{ fontSize: '10px' }}>
                          DEFAULT
                        </span>
                      )}
                    </h6>
                    <p className="text-secondary-custom small mb-0">
                      {statementTypes.find(t => t.value === template.statementType)?.label}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleDefault(template)}
                    className="btn btn-sm p-1 border-0 bg-transparent"
                    title={template.isDefault ? 'Remove as default' : 'Set as default'}
                  >
                    {template.isDefault ? (
                      <Star size={16} className="text-warning" fill="currentColor" />
                    ) : (
                      <StarOff size={16} className="text-secondary-custom" />
                    )}
                  </button>
                </div>

                <div className="mb-3">
                  <div className="d-flex gap-2 flex-wrap">
                    <span className="badge bg-dark border border-secondary text-secondary-custom" style={{ fontSize: '10px' }}>
                      {template.selectedColumns?.length || 0} columns
                    </span>
                    <span className="badge bg-dark border border-secondary text-secondary-custom" style={{ fontSize: '10px' }}>
                      {template.pageOrientation || 'portrait'}
                    </span>
                    {template.groupByCategory && (
                      <span className="badge bg-primary-subtle text-primary" style={{ fontSize: '10px' }}>
                        Grouped
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-auto d-flex gap-1">
                  <button
                    onClick={() => handleViewTemplate(template)}
                    className="btn btn-saas-secondary btn-sm flex-grow-1"
                    title="View Details"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="btn btn-saas-secondary btn-sm flex-grow-1"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDuplicateTemplate(template._id)}
                    className="btn btn-saas-secondary btn-sm flex-grow-1"
                    title="Duplicate"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template._id)}
                    className="btn btn-saas-secondary btn-sm text-danger"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="card-saas" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="text-white mb-0">{editingTemplate ? 'Edit Template' : 'Create New Template'}</h5>
              <button onClick={() => setShowForm(false)} className="btn btn-sm p-1 border-0 bg-transparent text-secondary-custom">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* Basic Info */}
                <div className="col-12">
                  <label className="form-label-saas">Template Name *</label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={formData.templateName}
                    onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                    required
                    placeholder="e.g., Monthly TA Report"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label-saas">Statement Type *</label>
                  <select
                    className="form-select form-control-saas"
                    value={formData.statementType}
                    onChange={(e) => handleStatementTypeChange(e.target.value)}
                    required
                  >
                    {statementTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Columns Section */}
                <div className="col-12">
                  <div className="border-top border-secondary pt-3">
                    <button
                      type="button"
                      className="btn btn-link text-white p-0 d-flex align-items-center gap-2 mb-2"
                      onClick={() => toggleSection('columns')}
                    >
                      {expandedSections.columns ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span className="font-weight-semibold">Column Selection</span>
                    </button>
                    {expandedSections.columns && (
                      <div className="row g-2">
                        {availableColumnsByType[formData.statementType].map(column => (
                          <div key={column.id} className="col-6">
                            <label className="d-flex align-items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.selectedColumns.includes(column.id)}
                                onChange={() => handleColumnToggle(column.id)}
                              />
                              <span className="text-secondary-custom small">{column.label}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Display Options */}
                <div className="col-12">
                  <div className="border-top border-secondary pt-3">
                    <button
                      type="button"
                      className="btn btn-link text-white p-0 d-flex align-items-center gap-2 mb-2"
                      onClick={() => toggleSection('display')}
                    >
                      {expandedSections.display ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span className="font-weight-semibold">Display Options</span>
                    </button>
                    {expandedSections.display && (
                      <div className="row g-2">
                        <div className="col-6">
                          <label className="d-flex align-items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.showEmployeeInfo}
                              onChange={(e) => setFormData({ ...formData, showEmployeeInfo: e.target.checked })}
                            />
                            <span className="text-secondary-custom small">Show Employee Info</span>
                          </label>
                        </div>
                        <div className="col-6">
                          <label className="d-flex align-items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.showSummaryTotals}
                              onChange={(e) => setFormData({ ...formData, showSummaryTotals: e.target.checked })}
                            />
                            <span className="text-secondary-custom small">Show Summary Totals</span>
                          </label>
                        </div>
                        <div className="col-6">
                          <label className="d-flex align-items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.showSignatureSection}
                              onChange={(e) => setFormData({ ...formData, showSignatureSection: e.target.checked })}
                            />
                            <span className="text-secondary-custom small">Show Signature Section</span>
                          </label>
                        </div>
                        <div className="col-6">
                          <label className="d-flex align-items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.showRemarks}
                              onChange={(e) => setFormData({ ...formData, showRemarks: e.target.checked })}
                            />
                            <span className="text-secondary-custom small">Show Remarks Column</span>
                          </label>
                        </div>
                        <div className="col-6">
                          <label className="d-flex align-items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.groupByCategory}
                              onChange={(e) => setFormData({ ...formData, groupByCategory: e.target.checked })}
                            />
                            <span className="text-secondary-custom small">Group by Category</span>
                          </label>
                        </div>
                        <div className="col-6">
                          <label className="d-flex align-items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.groupByTrain}
                              onChange={(e) => setFormData({ ...formData, groupByTrain: e.target.checked })}
                            />
                            <span className="text-secondary-custom small">Group by Train</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Layout Options */}
                <div className="col-12">
                  <div className="border-top border-secondary pt-3">
                    <button
                      type="button"
                      className="btn btn-link text-white p-0 d-flex align-items-center gap-2 mb-2"
                      onClick={() => toggleSection('layout')}
                    >
                      {expandedSections.layout ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span className="font-weight-semibold">Page Layout</span>
                    </button>
                    {expandedSections.layout && (
                      <div className="row g-3">
                        <div className="col-6">
                          <label className="form-label-saas">Page Orientation</label>
                          <select
                            className="form-select form-control-saas"
                            value={formData.pageOrientation}
                            onChange={(e) => setFormData({ ...formData, pageOrientation: e.target.value })}
                          >
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                          </select>
                        </div>
                        <div className="col-6">
                          <label className="form-label-saas">Font Size</label>
                          <select
                            className="form-select form-control-saas"
                            value={formData.fontSize}
                            onChange={(e) => setFormData({ ...formData, fontSize: e.target.value })}
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="form-label-saas">Custom Header (Optional)</label>
                          <input
                            type="text"
                            className="form-control form-control-saas"
                            value={formData.customHeader}
                            onChange={(e) => setFormData({ ...formData, customHeader: e.target.value })}
                            placeholder="e.g., Central Railway - Mumbai Division"
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label-saas">Custom Footer (Optional)</label>
                          <input
                            type="text"
                            className="form-control form-control-saas"
                            value={formData.customFooter}
                            onChange={(e) => setFormData({ ...formData, customFooter: e.target.value })}
                            placeholder="e.g., Generated by RailAssist Enterprise"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Default Template */}
                <div className="col-12">
                  <div className="border-top border-secondary pt-3">
                    <label className="d-flex align-items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      />
                      <span className="text-white">Set as default template for this statement type</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-saas-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow-primary">
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Template Modal */}
      {viewingTemplate && (
        <div className="modal-overlay" onClick={() => setViewingTemplate(null)}>
          <div className="card-saas" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="text-white mb-0">Template Details</h5>
              <button onClick={() => setViewingTemplate(null)} className="btn btn-sm p-1 border-0 bg-transparent text-secondary-custom">
                <X size={20} />
              </button>
            </div>

            <div className="mb-3">
              <h6 className="text-white mb-1">{viewingTemplate.templateName}</h6>
              <p className="text-secondary-custom small mb-0">
                {statementTypes.find(t => t.value === viewingTemplate.statementType)?.label}
              </p>
            </div>

            <div className="mb-3">
              <h6 className="text-white small mb-2">Selected Columns ({viewingTemplate.selectedColumns?.length || 0})</h6>
              <div className="d-flex flex-wrap gap-2">
                {viewingTemplate.selectedColumns?.map(colId => {
                  const col = availableColumnsByType[viewingTemplate.statementType]?.find(c => c.id === colId);
                  return col ? (
                    <span key={colId} className="badge bg-dark border border-secondary text-secondary-custom" style={{ fontSize: '11px' }}>
                      {col.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            <div className="mb-3">
              <h6 className="text-white small mb-2">Display Options</h6>
              <div className="row g-2">
                <div className="col-6">
                  <span className="text-secondary-custom small">Employee Info: </span>
                  <span className="text-white small">{viewingTemplate.showEmployeeInfo ? 'Yes' : 'No'}</span>
                </div>
                <div className="col-6">
                  <span className="text-secondary-custom small">Summary Totals: </span>
                  <span className="text-white small">{viewingTemplate.showSummaryTotals ? 'Yes' : 'No'}</span>
                </div>
                <div className="col-6">
                  <span className="text-secondary-custom small">Signature: </span>
                  <span className="text-white small">{viewingTemplate.showSignatureSection ? 'Yes' : 'No'}</span>
                </div>
                <div className="col-6">
                  <span className="text-secondary-custom small">Remarks: </span>
                  <span className="text-white small">{viewingTemplate.showRemarks ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <h6 className="text-white small mb-2">Page Layout</h6>
              <div className="row g-2">
                <div className="col-6">
                  <span className="text-secondary-custom small">Orientation: </span>
                  <span className="text-white small text-capitalize">{viewingTemplate.pageOrientation || 'portrait'}</span>
                </div>
                <div className="col-6">
                  <span className="text-secondary-custom small">Font Size: </span>
                  <span className="text-white small text-capitalize">{viewingTemplate.fontSize || 'medium'}</span>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 mt-4">
              <button onClick={() => { handleEditTemplate(viewingTemplate); setViewingTemplate(null); }} className="btn btn-glow-primary flex-grow-1">
                Edit Template
              </button>
              <button onClick={() => setViewingTemplate(null)} className="btn btn-saas-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementTemplates;
