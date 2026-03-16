import { useState, useMemo } from 'react';
import type { Transaction, Asset, TxType } from '../../types';
import { genId, todayDDMMYYYY, getIndianFY, fmtINR } from '../../utils';
import ZerodhaImporter from './ZerodhaImporter';

interface Props {
  transactions: Transaction[];
  assets: Asset[];
  onChange: (txs: Transaction[]) => void;
  onRun: () => void;
  running: boolean;
  progress: string;
}

const BLANK = (): Omit<Transaction, 'id'> => ({
  asset_name: '', date: todayDDMMYYYY(), tr_type: 'Buy',
  rate: 0, quantity: 0, amount: 0,
  brokerage: 0, gst: 0, stt: 0, sebi_tax: 0,
  exchange_charges: 0, stamp_duty: 0, other_charges: 0, ipft_charges: 0,
  total_charges: 0,
});

const calcCharges = (tx: Omit<Transaction, 'id'>) =>
  tx.brokerage + tx.gst + tx.stt + tx.sebi_tax +
  tx.exchange_charges + tx.stamp_duty + tx.other_charges + tx.ipft_charges;

export default function TransactionsManager({ transactions, assets, onChange, onRun, running, progress }: Props) {
  const [form, setForm] = useState(BLANK());
  const [editId, setEditId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [showCharges, setShowCharges] = useState(false);
  const [showImporter, setShowImporter] = useState(false);

  const set = (k: keyof Omit<Transaction, 'id'>, v: string | number) => {
    setForm(f => {
      const u = { ...f, [k]: v };
      if (k === 'rate' || k === 'quantity') u.amount = +(u.rate * u.quantity).toFixed(2);
      u.total_charges = +calcCharges(u).toFixed(2);
      return u;
    });
  };

  const validate = () => {
    const e: string[] = [];
    if (!form.asset_name) e.push('Select an asset');
    if (!form.date) e.push('Date required');
    if (form.rate <= 0) e.push('Rate must be > 0');
    if (form.quantity <= 0) e.push('Quantity must be > 0');
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    if (editId) {
      onChange(transactions.map(t => t.id === editId ? { ...form, id: editId } : t));
      setEditId(null);
    } else {
      onChange([...transactions, { ...form, id: genId() }]);
    }
    setForm(BLANK());
    setShowCharges(false);
  };

  const handleEdit = (tx: Transaction) => {
    const { id, ...rest } = tx;
    setForm(rest); setEditId(id); setErrors([]);
    setShowCharges(calcCharges(rest) > 0);
  };

  const handleDelete = (id: string) => onChange(transactions.filter(t => t.id !== id));
  const cancel = () => { setEditId(null); setForm(BLANK()); setErrors([]); };

  const filtered = useMemo(() =>
    transactions
      .filter(t => !filter || t.asset_name.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => {
        const p = (d: string) => { const [dd,mm,yy] = d.split('-').map(Number); return new Date(yy,mm-1,dd).getTime(); };
        return p(a.date) - p(b.date);
      })
  , [transactions, filter]);

  const stats = useMemo(() => ({
    buys:     transactions.filter(t => t.tr_type === 'Buy').length,
    sells:    transactions.filter(t => t.tr_type === 'Sell').length,
    invested: transactions.filter(t => t.tr_type === 'Buy').reduce((s,t) => s + t.amount, 0),
  }), [transactions]);

  const CHARGES: [keyof Omit<Transaction,'id'>, string][] = [
    ['brokerage','Brokerage'], ['gst','GST'], ['stt','STT'],
    ['sebi_tax','SEBI Tax'], ['exchange_charges','Exchange Charges'],
    ['stamp_duty','Stamp Duty'], ['other_charges','Other Charges'], ['ipft_charges','IPFT'],
  ];

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">Enter your complete buy/sell history for capital gains calculation</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {transactions.length > 0 && (
            <>
              <span className="badge badge-green">{stats.buys} buys</span>
              <span className="badge badge-red">{stats.sells} sells</span>
            </>
          )}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowImporter(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <span>📂</span> Import Zerodha CSV
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">{editId ? '✎ Edit Transaction' : '+ Add Transaction'}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="form-group">
            <label className="form-label">Asset *</label>
            {assets.length === 0 ? (
              <div className="alert alert-warn" style={{ padding: '7px 10px', fontSize: 12 }}>
                Add assets in the Assets tab first
              </div>
            ) : (
              <select className="select input" value={form.asset_name}
                onChange={e => set('asset_name', e.target.value)}>
                <option value="">Select asset...</option>
                {assets.map(a => <option key={a.id}>{a.asset_name}</option>)}
              </select>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Date * (DD-MM-YYYY)</label>
            <input className="input mono" placeholder="01-04-2023"
              value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="select input" value={form.tr_type}
              onChange={e => set('tr_type', e.target.value as TxType)}>
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Rate ₹ *</label>
            <input className="input mono" type="number" min="0" step="0.01"
              value={form.rate || ''} onChange={e => set('rate', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="form-group">
            <label className="form-label">Quantity *</label>
            <input className="input mono" type="number" min="0" step="0.001"
              value={form.quantity || ''} onChange={e => set('quantity', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="form-group">
            <label className="form-label">Amount (auto)</label>
            <input className="input mono" readOnly
              value={form.amount ? fmtINR(form.amount, 2).replace('₹','') : ''}
              style={{ background: 'var(--surface2)', color: 'var(--muted)', cursor: 'not-allowed' }} />
          </div>
        </div>

        {/* Charges toggle */}
        <button className="btn btn-ghost btn-sm" onClick={() => setShowCharges(v => !v)}
          style={{ marginBottom: showCharges ? 12 : 0 }}>
          {showCharges ? '▲ Hide Charges' : '▼ Add Brokerage, STT, GST...'}
        </button>

        {showCharges && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10, marginTop: 4 }}>
              {CHARGES.map(([k, label]) => (
                <div className="form-group" key={k}>
                  <label className="form-label">{label} ₹</label>
                  <input className="input mono input-sm" type="number" min="0" step="0.01"
                    value={(form[k] as number) || ''}
                    onChange={e => set(k, parseFloat(e.target.value) || 0)} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontFamily: 'var(--mono)' }}>
              Total charges:{' '}
              <strong style={{ color: form.total_charges > 0 ? 'var(--amber)' : 'var(--muted)' }}>
                {fmtINR(form.total_charges, 2)}
              </strong>
            </div>
          </>
        )}

        {errors.length > 0 && (
          <div className="alert alert-error" style={{ marginBottom: 12, padding: '8px 12px' }}>
            {errors.join(' · ')}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleSave}>
            {editId ? 'Update Transaction' : '+ Add Transaction'}
          </button>
          {editId && <button className="btn btn-ghost" onClick={cancel}>Cancel</button>}
        </div>
      </div>

      {/* Run CTA */}
      {transactions.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--indigo-bdr)', background: 'linear-gradient(135deg, #fafbff, #f0f2ff)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 3 }}>
                Ready to calculate capital gains
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {transactions.length} transactions · {assets.length} assets ·{' '}
                Total invested: <strong style={{ color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{fmtINR(stats.invested)}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {running ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="spinner" />
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{progress || 'Calculating...'}</span>
                </div>
              ) : (
                <button className="btn btn-success btn-lg" onClick={onRun} disabled={assets.length === 0}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Calculate Capital Gains
                </button>
              )}
              {running && (
                <div className="progress-wrap" style={{ width: 220 }}>
                  <div className="progress-fill" style={{ width: '65%' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter + table */}
      {transactions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">⇄</div>
            <div className="empty-title">No transactions yet</div>
            <div className="empty-sub">Add your buy/sell history above to start the calculation</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '0 0 280px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted2)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className="input input-sm" style={{ paddingLeft: 32 }}
                placeholder="Filter by asset name..." value={filter}
                onChange={e => setFilter(e.target.value)} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {filtered.length} of {transactions.length} transactions
            </span>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Asset</th>
                  <th>FY</th>
                  <th>Type</th>
                  <th className="right">Rate</th>
                  <th className="right">Qty</th>
                  <th className="right">Amount</th>
                  <th className="right">Charges</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
                  <tr key={tx.id} style={{ background: editId === tx.id ? '#f8f7ff' : '' }}>
                    <td className="mono" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{tx.date}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text)' }}>{tx.asset_name}</td>
                    <td>
                      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', background: 'var(--surface3)', padding: '2px 6px', borderRadius: 4 }}>
                        {getIndianFY(tx.date)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${tx.tr_type === 'Buy' ? 'badge-green' : 'badge-red'}`}>
                        {tx.tr_type}
                      </span>
                    </td>
                    <td className="mono right" style={{ color: 'var(--text)' }}>{fmtINR(tx.rate, 2)}</td>
                    <td className="mono right">{tx.quantity.toFixed(3)}</td>
                    <td className="mono right" style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtINR(tx.amount)}</td>
                    <td className="mono right" style={{ color: tx.total_charges > 0 ? 'var(--amber)' : 'var(--muted2)' }}>
                      {tx.total_charges > 0 ? fmtINR(tx.total_charges, 2) : '—'}
                    </td>
                    <td className="center">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button className="btn-icon" title="Edit" onClick={() => handleEdit(tx)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(tx.id)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      {/* Zerodha Importer Modal */}
      {showImporter && (
        <ZerodhaImporter
          existingAssets={assets}
          existingTransactions={transactions}
          onImport={(newAssets, newTxs) => {
            console.log(newAssets)
            onChange(newTxs);
          }}
          onClose={() => setShowImporter(false)}
        />
      )}
    </div>
  );
}
