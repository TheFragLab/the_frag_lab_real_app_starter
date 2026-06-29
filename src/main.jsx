
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Beaker, BookOpen, FlaskConical, Search, Sparkles } from 'lucide-react';
import { seedSpecimens } from './data/seedSpecimens.js';
import './styles.css';

const STORAGE_KEY = 'the-frag-lab-alpha-state-v1';

const starterExperiment = {
  id: 'exp-country-girl-velvet-rose',
  title: 'Country Girl + Velvet Rose yvette test',
  status: 'Active',
  hypothesis: 'Country Girl may enhance Velvet Rose by supporting the creamy sweet floral facets of the Donna Born in Roma DNA.',
  purpose: 'Test compatibility and determine whether Country Girl acts as support or competes.',
  formula: ['country-girl', 'velvet-rose'],
  observations: {
    opening: '',
    heart: '',
    drydown: '',
    unexpected: '',
    final: ''
  },
  rating: '',
  result: 'Under Testing',
  createdAt: new Date().toISOString()
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch {}
  return {
    specimens: seedSpecimens,
    experiments: [starterExperiment],
    bench: { base: '', oil: '', primary: 'country-girl', secondary: 'velvet-rose', accent: '' },
    ideas: [
      { id: 'idea-1', text: 'Does Country Girl play nicely with Velvet Rose / Donna Born in Roma DNA?', status: 'Testing' }
    ]
  };
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function Chip({ children }) {
  if (!children) return null;
  return <span className="chip">{children}</span>;
}

function Field({ label, value }) {
  return (
    <div className="field">
      <div className="label">{label}</div>
      <div className="value">{value || '—'}</div>
    </div>
  );
}

function App() {
  const [state, setState] = useState(loadState);
  const [screen, setScreen] = useState('bench');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const update = (next) => {
    setState(next);
    saveState(next);
  };

  const specimensById = useMemo(() => Object.fromEntries(state.specimens.map(s => [s.id, s])), [state.specimens]);

  const filtered = state.specimens.filter(s => {
    const blob = [s.name, s.brand, s.type, s.family, s.role, s.status, s.notes, s.inspiredBy].join(' ').toLowerCase();
    return blob.includes(query.toLowerCase());
  });

  const setBench = (slot, id) => {
    update({ ...state, bench: { ...state.bench, [slot]: id } });
  };

  const mixBench = () => {
    const formula = Object.values(state.bench).filter(Boolean);
    if (!formula.length) return;
    const names = formula.map(id => specimensById[id]?.name).filter(Boolean);
    const exp = {
      id: 'exp-' + Date.now(),
      title: names.join(' + '),
      status: 'Active',
      hypothesis: '',
      purpose: '',
      formula,
      observations: { opening: '', heart: '', drydown: '', unexpected: '', final: '' },
      rating: '',
      result: 'Under Testing',
      createdAt: new Date().toISOString()
    };
    update({ ...state, experiments: [exp, ...state.experiments] });
    setScreen('reports');
  };

  const updateExperiment = (id, patch) => {
    const experiments = state.experiments.map(e => e.id === id ? { ...e, ...patch } : e);
    update({ ...state, experiments });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'the-frag-lab-backup.json';
    a.click();
  };

  return (
    <div className="app">
      <header>
        <div className="brandRow">
          <div className="logo"><FlaskConical size={26}/></div>
          <div>
            <h1>The Frag Lab</h1>
            <p>Explore the DNA. Preserve the Royals.</p>
          </div>
        </div>
        <blockquote>The Canon isn't someone else's opinion. It's your proven knowledge.</blockquote>
      </header>

      <main>
        {screen === 'bench' && (
          <section>
            <h2><Beaker/> The Bench</h2>
            <p className="muted">Build a live formula, then mix it into a Lab Report.</p>
            {[
              ['base', 'Body Care / Base'],
              ['oil', 'Oil'],
              ['primary', 'Primary'],
              ['secondary', 'Secondary / Accent'],
              ['accent', 'Extra Accent']
            ].map(([slot, label]) => (
              <div className="slot" key={slot}>
                <h3>{label}</h3>
                <select value={state.bench[slot] || ''} onChange={e => setBench(slot, e.target.value)}>
                  <option value="">Choose specimen...</option>
                  {state.specimens.map(s => <option key={s.id} value={s.id}>{s.name} — {s.brand}</option>)}
                </select>
                {state.bench[slot] && <div className="slotPreview">{specimensById[state.bench[slot]]?.family}</div>}
              </div>
            ))}
            <button className="mix" onClick={mixBench}>🧪 MIX</button>
          </section>
        )}

        {screen === 'canon' && (
          <section>
            <h2><BookOpen/> The Canon</h2>
            <div className="search"><Search size={18}/><input placeholder="Search specimens..." value={query} onChange={e => setQuery(e.target.value)} /></div>
            <div className="grid">
              {filtered.map(s => (
                <article className="card" key={s.id} onClick={() => setSelected(s)}>
                  <h3>{s.name}</h3>
                  <p>{s.brand} · {s.type}</p>
                  <Chip>{s.role}</Chip><Chip>{s.family}</Chip><Chip>{s.status}</Chip>
                </article>
              ))}
            </div>
          </section>
        )}

        {screen === 'reports' && (
          <section>
            <h2><Sparkles/> Lab Reports</h2>
            {state.experiments.map(e => (
              <article className="report" key={e.id}>
                <h3>{e.title}</h3>
                <Chip>{e.status}</Chip><Chip>{e.result}</Chip>
                <div className="formula">
                  {e.formula.map(id => <span key={id}>{specimensById[id]?.name || id}</span>)}
                </div>
                <label>Hypothesis</label>
                <textarea value={e.hypothesis} onChange={ev => updateExperiment(e.id, { hypothesis: ev.target.value })}/>
                <label>Purpose</label>
                <textarea value={e.purpose} onChange={ev => updateExperiment(e.id, { purpose: ev.target.value })}/>
                {Object.keys(e.observations).map(k => (
                  <React.Fragment key={k}>
                    <label>{k[0].toUpperCase() + k.slice(1)} Observation</label>
                    <textarea value={e.observations[k]} onChange={ev => updateExperiment(e.id, { observations: { ...e.observations, [k]: ev.target.value } })}/>
                  </React.Fragment>
                ))}
                <label>Rating / Result</label>
                <input value={e.rating} placeholder="🔥🔥🔥🔥🔥" onChange={ev => updateExperiment(e.id, { rating: ev.target.value })}/>
                <select value={e.result} onChange={ev => updateExperiment(e.id, { result: ev.target.value })}>
                  <option>Under Testing</option>
                  <option>Repeat Worthy</option>
                  <option>Canon Certified</option>
                  <option>Failed Experiment</option>
                </select>
              </article>
            ))}
          </section>
        )}

        {screen === 'ideas' && (
          <section>
            <h2>💡 I Wonder...</h2>
            {state.ideas.map(i => <article className="card" key={i.id}><h3>{i.text}</h3><Chip>{i.status}</Chip></article>)}
          </section>
        )}

        <button className="secondary" onClick={exportData}>Export Backup</button>
      </main>

      <nav>
        <button className={screen==='bench'?'active':''} onClick={()=>setScreen('bench')}>Bench</button>
        <button className={screen==='canon'?'active':''} onClick={()=>setScreen('canon')}>Canon</button>
        <button className={screen==='reports'?'active':''} onClick={()=>setScreen('reports')}>Reports</button>
        <button className={screen==='ideas'?'active':''} onClick={()=>setScreen('ideas')}>I Wonder</button>
      </nav>

      {selected && (
        <div className="modal" onClick={() => setSelected(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)}>✕</button>
            <h2>{selected.name}</h2>
            <p>{selected.brand} · {selected.type}</p>
            <div className="detailGrid">
              <Field label="Family / DNA" value={selected.family}/>
              <Field label="Role" value={selected.role}/>
              <Field label="Status" value={selected.status}/>
              <Field label="Inspired By" value={selected.inspiredBy}/>
            </div>
            <h3>Yvette Notes</h3>
            <p>{selected.notes || '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
