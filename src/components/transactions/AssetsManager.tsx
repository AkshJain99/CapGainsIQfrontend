import { useState } from 'react';
import type { Asset, AssetClass, AssetSource } from '../../types';
import { genId } from '../../utils';

interface Props {
  assets: Asset[];
  onChange: (assets: Asset[]) => void;
}

const ASSET_CLASSES: AssetClass[] = ['EQUITY', 'DEBT', 'COMMODITY', 'MF'];
const SOURCES: { value: AssetSource; label: string }[] = [
  { value: 'YF', label: 'Yahoo Finance' },
  { value: 'MF', label: 'MF API (mfapi.in)' },
];

const BLANK: Omit<Asset, 'id'> = { asset_name: '', asset_class: 'EQUITY', ticker: '', source: 'YF' };

const CLASS_BADGE: Record<AssetClass, string> = {
  EQUITY: 'badge-blue', DEBT: 'badge-amber', COMMODITY: 'badge-green', MF: 'badge-indigo',
};

export default function AssetsManager({ assets, onChange }: Props) {
  const [form, setForm] = useState({ ...BLANK });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const validate = () => {
    if (!form.asset_name.trim()) return 'Asset name is required';
    if (!form.ticker.trim()) return 'Ticker symbol is required';
    if (assets.some(a => a.id !== editId && a.asset_name === form.asset_name.trim().toUpperCase()))
      return 'Asset name already exists';
    return '';
  };

  const handleSave = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    const entry = { ...form, asset_name: form.asset_name.trim().toUpperCase() };
    if (editId) {
      onChange(assets.map(a => a.id === editId ? { ...entry, id: editId } : a));
      setEditId(null);
    } else {
      onChange([...assets, { ...entry, id: genId() }]);
    }
    setForm({ ...BLANK });
  };

  const handleEdit = (a: Asset) => {
    setForm({ asset_name: a.asset_name, asset_class: a.asset_class, ticker: a.ticker, source: a.source });
    setEditId(a.id);
    setError('');
  };

  const handleDelete = (id: string) => {
    onChange(assets.filter(a => a.id !== id));
    if (editId === id) { setEditId(null); setForm({ ...BLANK }); }
  };

  return (
    <div className="fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Asset Universe</h1>
          <p className="page-sub">Define the stocks, ETFs and mutual funds you have traded</p>
        </div>
        {assets.length > 0 && (
          <span className="badge badge-indigo" style={{ fontSize: 12, padding: '5px 12px' }}>
            {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
          </span>
        )}
      </div>

      {/* Form card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">{editId ? '✎ Edit Asset' : '+ Add New Asset'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1.2fr', gap: 14, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">Asset Name *</label>
            <input className="input" placeholder="e.g. RELIANCE, NIFTYBEES, HDFC"
              value={form.asset_name}
              onChange={e => setForm(f => ({ ...f, asset_name: e.target.value.toUpperCase() }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Asset Class</label>
            <select className="select input" value={form.asset_class}
              onChange={e => setForm(f => ({ ...f, asset_class: e.target.value as AssetClass }))}>
              {ASSET_CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Ticker Symbol *</label>
            <input className="input mono" placeholder="e.g. RELIANCE.NS"
              value={form.ticker}
              onChange={e => setForm(f => ({ ...f, ticker: e.target.value.trim() }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Price Source</label>
            <select className="select input" value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value as AssetSource }))}>
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 12, padding: '8px 12px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleSave}>
            {editId ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Update Asset
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Asset
              </>
            )}
          </button>
          {editId && (
            <button className="btn btn-ghost" onClick={() => { setEditId(null); setForm({ ...BLANK }); setError(''); }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {assets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <div className="empty-title">No assets added yet</div>
            <div className="empty-sub">Add your stocks, ETFs and mutual funds above to get started</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Asset Name</th>
                  <th>Class</th>
                  <th>Ticker</th>
                  <th>Source</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a, i) => (
                  <tr key={a.id} style={{ background: editId === a.id ? '#f8f7ff' : '' }}>
                    <td className="mono" style={{ color: 'var(--muted2)', fontSize: 11 }}>{i + 1}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{a.asset_name}</span>
                    </td>
                    <td><span className={`badge ${CLASS_BADGE[a.asset_class]}`}>{a.asset_class}</span></td>
                    <td><span className="mono" style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--surface3)', padding: '2px 7px', borderRadius: 4 }}>{a.ticker}</span></td>
                    <td><span className="badge badge-gray">{a.source === 'YF' ? 'Yahoo Finance' : 'MF API'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" title="Edit" onClick={() => handleEdit(a)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(a.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Help */}
      <div className="info-box" style={{ marginTop: 16 }}>
        <strong>Ticker format: </strong>
        Yahoo Finance — use <code style={{ fontFamily: 'var(--mono)', background: '#dbeafe', padding: '1px 5px', borderRadius: 3 }}>RELIANCE.NS</code> for NSE,{' '}
        <code style={{ fontFamily: 'var(--mono)', background: '#dbeafe', padding: '1px 5px', borderRadius: 3 }}>RELIANCE.BO</code> for BSE.{' '}
        MF API — use the numeric scheme code from mfapi.in, e.g.{' '}
        <code style={{ fontFamily: 'var(--mono)', background: '#dbeafe', padding: '1px 5px', borderRadius: 3 }}>120503</code>.
      </div>
    </div>
  );
}
