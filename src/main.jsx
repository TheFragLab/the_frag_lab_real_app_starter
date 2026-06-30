import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Beaker,
  BookOpen,
  ClipboardList,
  Database,
  Droplets,
  Edit3,
  FlaskConical,
  Heart,
  Plus,
  RotateCcw,
  Save,
  Search,
  Scale,
  Sparkles,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import { specimensData } from './data/specimensData';
import './styles.css';

const STORAGE_KEY = 'the-frag-lab-alpha-state-v6-bench-builder';

function starterState() {
  return {
    specimens: specimensData,
    selectedId: specimensData[0]?.id || '',
    screen: 'specimens',
    bench: {
      formulaName: '',
      bodyCare: '',
      oil: '',
      fragrance1: '',
      fragrance2: '',
      fragrance3: '',
      notes: '',
      verdict: ''
    },
    reports: []
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.specimens?.length) {
      return {
        ...starterState(),
        ...saved,
        bench: {
          ...starterState().bench,
          ...(saved.bench || {})
        },
        reports: saved.reports || []
      };
    }
  } catch {}
  return starterState();
}

function specimenNumber(specimen) {
  return specimen.specimenNumber || specimen.number || '0000';
}

function numberAsInt(specimen) {
  return Number.parseInt(String(specimenNumber(specimen)).replace(/\D/g, ''), 10) || 0;
}

function nextSpecimenNumber(specimens) {
  const highest = specimens.reduce((max, specimen) => Math.max(max, numberAsInt(specimen)), 0);
  return String(highest + 1).padStart(4, '0');
}

function slugify(text) {
  return String(text || 'new-specimen')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'new-specimen';
}

function isTribute(specimen) {
  return Boolean(specimen.tribute || specimen.isTribute || specimen.royalStatus?.toLowerCase?.().includes('tribute'));
}

function categoryOf(specimen) {
  return specimen.category || specimen.type || 'Specimen';
}

function brandOf(specimen) {
  return specimen.brand || specimen.house || specimen.maker || 'Unknown';
}

function nameOf(specimen) {
  return specimen?.displayName || specimen?.name || 'Untitled';
}

function labelFor(specimen) {
  if (isTribute(specimen)) return `Tribute Specimen #${specimenNumber(specimen)}`;
  return `#${specimenNumber(specimen)} · ${categoryOf(specimen)}`;
}

function makeSearchBlob(specimen) {
  return [
    specimen.name,
    specimen.displayName,
    specimen.brand,
    specimen.house,
    specimen.maker,
    specimen.category,
    specimen.type,
    specimen.size,
    specimen.concentration,
    specimen.role,
    specimen.royalStatus,
    specimen.inventoryStatus,
    specimen.reviewStatus,
    specimen.replacementStatus,
    specimen.family,
    specimen.dna,
    specimen.status,
    specimen.notes,
    specimen.scientistNotes,
    Array.isArray(specimen.topNotes) ? specimen.topNotes.join(' ') : specimen.topNotes,
    Array.isArray(specimen.middleNotes) ? specimen.middleNotes.join(' ') : specimen.middleNotes,
    Array.isArray(specimen.heartNotes) ? specimen.heartNotes.join(' ') : specimen.heartNotes,
    Array.isArray(specimen.baseNotes) ? specimen.baseNotes.join(' ') : specimen.baseNotes,
    specimen.labConfidence,
    specimen.inspiredBy
  ].filter(Boolean).join(' ').toLowerCase();
}

function smartTokens(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function matchesSmartQuery(specimen, query) {
  const tokens = smartTokens(query);
  if (tokens.length === 0) return true;

  const blob = makeSearchBlob(specimen);
  return tokens.every((token) => blob.includes(token));
}

function matchesQuickFilter(specimen, quickFilter) {
  const category = categoryOf(specimen).toLowerCase();
  const status = String(specimen.status || specimen.reviewStatus || '').toLowerCase();
  const role = String(specimen.role || '').toLowerCase();
  const royal = String(specimen.royalStatus || '').toLowerCase();

  if (quickFilter === 'All') return true;
  if (quickFilter === 'Body Care') return isBodyCare(specimen);
  if (quickFilter === 'Oils') return isOil(specimen);
  if (quickFilter === 'Perfumes') return isPerfume(specimen);
  if (quickFilter === 'Needs Review') return status.includes('review');
  if (quickFilter === 'Verified') return status.includes('verified');
  if (quickFilter === 'Royals') return role.includes('queen') || role.includes('king') || role.includes('noble') || royal.includes('queen') || royal.includes('king') || royal.includes('noble') || royal.includes('tribute');
  if (quickFilter === 'Tribute') return isTribute(specimen);

  return category.includes(quickFilter.toLowerCase());
}

const quickFilters = ['All', 'Body Care', 'Oils', 'Perfumes', 'Needs Review', 'Verified', 'Royals', 'Tribute'];

function dnaTokens(specimen) {
  return [
    specimen.family,
    specimen.dna,
    Array.isArray(specimen.topNotes) ? specimen.topNotes.join(' ') : specimen.topNotes,
    Array.isArray(specimen.middleNotes) ? specimen.middleNotes.join(' ') : specimen.middleNotes,
    Array.isArray(specimen.heartNotes) ? specimen.heartNotes.join(' ') : specimen.heartNotes,
    Array.isArray(specimen.baseNotes) ? specimen.baseNotes.join(' ') : specimen.baseNotes,
    specimen.notes,
    specimen.scientistNotes,
    specimen.inspiredBy
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s/,&+-]/g, ' ')
    .split(/[\s/,&+.-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .filter((token) => !['the','and','with','for','oil','body','care','perfume','needs','review','imported'].includes(token));
}

function compareSpecimens(left, right) {
  if (!left || !right) return { shared: [], leftOnly: [], rightOnly: [], score: 0 };

  const leftTokens = Array.from(new Set(dnaTokens(left)));
  const rightTokens = Array.from(new Set(dnaTokens(right)));

  const shared = leftTokens.filter((token) => rightTokens.includes(token)).slice(0, 18);
  const leftOnly = leftTokens.filter((token) => !rightTokens.includes(token)).slice(0, 18);
  const rightOnly = rightTokens.filter((token) => !leftTokens.includes(token)).slice(0, 18);

  const totalUnique = new Set([...leftTokens, ...rightTokens]).size || 1;
  const score = Math.round((shared.length / totalUnique) * 100);

  return { shared, leftOnly, rightOnly, score };
}

function ComparePicker({ label, value, onChange, specimens }) {
  const [search, setSearch] = React.useState('');
  const selected = specimens.find((specimen) => specimen.id === value);
  const filtered = specimens
    .filter((specimen) => matchesSmartQuery(specimen, search))
    .slice(0, 24);

  return (
    <div className="searchPicker">
      <div className="pickerHeader">
        <span>{label}</span>
        {selected && <button className="tinyButton" onClick={() => onChange('')}>Clear</button>}
      </div>

      <input
        value={search}
        placeholder={selected ? `Selected: #${specimenNumber(selected)} · ${brandOf(selected)} · ${nameOf(selected)}` : 'Type to compare...'}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="pickerResults compact">
        {filtered.map((specimen) => (
          <button
            key={specimen.id}
            type="button"
            className={`pickerOption ${specimen.id === value ? 'chosen' : ''}`}
            onClick={() => {
              onChange(specimen.id);
              setSearch('');
            }}
          >
            <strong>#{specimenNumber(specimen)} · {brandOf(specimen)} · {nameOf(specimen)}</strong>
            <small>{categoryOf(specimen)} · {specimen.family || specimen.dna || specimen.type || 'No DNA yet'}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function CompareValue({ label, left, right }) {
  const same = String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase() && String(left || '').trim() !== '';

  return (
    <div className={`compareRow ${same ? 'same' : ''}`}>
      <div className="compareLabel">{label}</div>
      <div>{left || '—'}</div>
      <div>{right || '—'}</div>
    </div>
  );
}

function ComparePage({ specimens, leftId, rightId, setLeftId, setRightId }) {
  const left = specimens.find((specimen) => specimen.id === leftId);
  const right = specimens.find((specimen) => specimen.id === rightId);
  const comparison = compareSpecimens(left, right);

  return (
    <section>
      <div className="sectionTitle">
        <h2><Scale /> Side-by-Side Compare</h2>
      </div>

      <div className="comparePickers">
        <ComparePicker label="Left Specimen" value={leftId} onChange={setLeftId} specimens={specimens} />
        <ComparePicker label="Right Specimen" value={rightId} onChange={setRightId} specimens={specimens} />
      </div>

      {left && right ? (
        <>
          <div className="panel compareScore">
            <p className="eyebrow">Starter Similarity</p>
            <strong>{comparison.score}%</strong>
            <p>Based on overlapping DNA/family/note words in your database. This gets smarter as you add richer notes.</p>
          </div>

          <div className="compareTable">
            <div className="compareHeader">
              <div></div>
              <div>
                <p className="specimenNumber">{labelFor(left)}</p>
                <h3>{nameOf(left)}</h3>
                <p>{brandOf(left)}</p>
              </div>
              <div>
                <p className="specimenNumber">{labelFor(right)}</p>
                <h3>{nameOf(right)}</h3>
                <p>{brandOf(right)}</p>
              </div>
            </div>

            <CompareValue label="Category" left={categoryOf(left)} right={categoryOf(right)} />
            <CompareValue label="Type" left={left.type} right={right.type} />
            <CompareValue label="Size" left={left.size} right={right.size} />
            <CompareValue label="Family" left={left.family} right={right.family} />
            <CompareValue label="DNA" left={left.dna} right={right.dna} />
            <CompareValue label="Role" left={left.role} right={right.role} />
            <CompareValue label="Status" left={left.status || left.reviewStatus} right={right.status || right.reviewStatus} />
            <CompareValue label="Lab Confidence" left={left.labConfidence} right={right.labConfidence} />
            <CompareValue label="Inspired By" left={left.inspiredBy} right={right.inspiredBy} />
            <CompareValue label="Top Notes" left={notesToText(left.topNotes).replace(/\n/g, ', ')} right={notesToText(right.topNotes).replace(/\n/g, ', ')} />
            <CompareValue label="Middle / Heart Notes" left={notesToText(left.middleNotes || left.heartNotes).replace(/\n/g, ', ')} right={notesToText(right.middleNotes || right.heartNotes).replace(/\n/g, ', ')} />
            <CompareValue label="Base Notes" left={notesToText(left.baseNotes).replace(/\n/g, ', ')} right={notesToText(right.baseNotes).replace(/\n/g, ', ')} />
            <CompareValue label="Bottle Level" left={left.bottleLevel ? `${left.bottleLevel}%` : ''} right={right.bottleLevel ? `${right.bottleLevel}%` : ''} />
          </div>

          <div className="compareInsightGrid">
            <div className="panel">
              <h3>Shared DNA</h3>
              <div>{comparison.shared.length ? comparison.shared.map((token) => <Chip key={token} tone="gold">{token}</Chip>) : <p>No shared DNA words yet.</p>}</div>
            </div>
            <div className="panel">
              <h3>Unique to {nameOf(left)}</h3>
              <div>{comparison.leftOnly.length ? comparison.leftOnly.map((token) => <Chip key={token}>{token}</Chip>) : <p>No unique words yet.</p>}</div>
            </div>
            <div className="panel">
              <h3>Unique to {nameOf(right)}</h3>
              <div>{comparison.rightOnly.length ? comparison.rightOnly.map((token) => <Chip key={token}>{token}</Chip>) : <p>No unique words yet.</p>}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="emptyState">
          <Scale size={34} />
          <h3>Pick two specimens</h3>
          <p>Compare Burberry Goddess Intense vs Lionheart, Libre vs Libre Intense, or any two fragrances in your lab.</p>
        </div>
      )}
    </section>
  );
}



function byId(specimens, id) {
  return specimens.find((specimen) => specimen.id === id);
}

function isBodyCare(specimen) {
  return categoryOf(specimen).toLowerCase().includes('body');
}

function isOil(specimen) {
  const category = categoryOf(specimen).toLowerCase();
  const type = String(specimen.type || '').toLowerCase();
  return category.includes('oil') || type.includes('perfume oil') || type.includes('oil');
}

function isPerfume(specimen) {
  const category = categoryOf(specimen).toLowerCase();
  const type = String(specimen.type || '').toLowerCase();

  if (isOil(specimen)) return false;
  if (isBodyCare(specimen)) return false;

  return category.includes('perfume') || type.includes('perfume') || type.includes('edp') || type.includes('edt') || type.includes('eau de parfum') || type.includes('eau de toilette');
}

function formulaItems(report) {
  return [report.bodyCare, report.oil, report.fragrance1, report.fragrance2, report.fragrance3].filter(Boolean);
}

function Chip({ children, tone = '' }) {
  if (!children) return null;
  return <span className={`chip ${tone}`}>{children}</span>;
}

function Field({ label, value }) {
  return (
    <div className="field">
      <div className="label">{label}</div>
      <div className="value">{value === undefined || value === null || value === '' ? '—' : String(value)}</div>
    </div>
  );
}

function notesToText(value) {
  if (Array.isArray(value)) return value.join('\n');
  return value || '';
}

function textToNotes(value) {
  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function NotesDisplay({ title, notes, tone = '' }) {
  const items = Array.isArray(notes) ? notes : textToNotes(notes);

  return (
    <div className={`notesPanel ${tone}`}>
      <div className="label">{title}</div>
      {items.length ? (
        <div className="noteChips">
          {items.map((note) => <span key={note}>{note}</span>)}
        </div>
      ) : (
        <p className="muted">No notes entered yet.</p>
      )}
    </div>
  );
}

function EditableField({ label, value, onChange, multiline = false, type = 'text' }) {
  return (
    <label className={`editField ${multiline ? 'wide' : ''}`}>
      <span>{label}</span>
      {multiline ? (
        <textarea value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type={type} value={value ?? ''} onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)} />
      )}
    </label>
  );
}

function EditableSelect({ label, value, onChange, options }) {
  return (
    <label className="editField">
      <span>{label}</span>
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">—</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function SpecimenSelect({ label, value, onChange, specimens, placeholder }) {
  const [search, setSearch] = React.useState('');
  const selected = specimens.find((specimen) => specimen.id === value);

  const filtered = specimens
    .filter((specimen) => {
      const blob = [
        specimenNumber(specimen),
        brandOf(specimen),
        nameOf(specimen),
        specimen.family,
        specimen.dna,
        specimen.type,
        specimen.category
      ].filter(Boolean).join(' ').toLowerCase();

      return blob.includes(search.toLowerCase());
    })
    .slice(0, 30);

  return (
    <div className="searchPicker">
      <div className="pickerHeader">
        <span>{label}</span>
        {selected && <button className="tinyButton" onClick={() => onChange('')}>Clear</button>}
      </div>

      <input
        value={search}
        placeholder={selected ? `Selected: #${specimenNumber(selected)} · ${brandOf(selected)} · ${nameOf(selected)}` : (placeholder || 'Type to search...')}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="pickerResults">
        {filtered.length === 0 ? (
          <button className="pickerOption empty" type="button">No matches</button>
        ) : (
          filtered.map((specimen) => (
            <button
              key={specimen.id}
              type="button"
              className={`pickerOption ${specimen.id === value ? 'chosen' : ''}`}
              onClick={() => {
                onChange(specimen.id);
                setSearch('');
              }}
            >
              <strong>#{specimenNumber(specimen)} · {brandOf(specimen)} · {nameOf(specimen)}</strong>
              <small>{categoryOf(specimen)} · {specimen.family || specimen.dna || specimen.type || 'No DNA yet'}</small>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function SpecimenCard({ specimen, selected, onClick }) {
  return (
    <article className={`specimenCard ${selected ? 'selected' : ''}`} onClick={onClick}>
      <p className="specimenNumber">{labelFor(specimen)}</p>
      <h3>{nameOf(specimen)}</h3>
      <p>{brandOf(specimen)} · {categoryOf(specimen)}</p>
      <div>
        <Chip tone={isTribute(specimen) ? 'gold' : ''}>{isTribute(specimen) ? 'Tribute' : specimen.role || specimen.reviewStatus || 'Needs Review'}</Chip>
        <Chip>{specimen.family || specimen.dna}</Chip>
        <Chip>{specimen.status || specimen.reviewStatus || 'Needs Review'}</Chip>
      </div>
    </article>
  );
}

const categoryOptions = ['Body Care', 'Oil', 'Perfume', 'Lab Report', 'Other'];
const statusOptions = ['Active', 'Needs Review', 'Verified', 'Testing', 'Canon Certified', 'Retired', 'Decluttered', 'Wishlist'];
const roleOptions = ['Specimen', 'Support', 'Soldier', 'Queen', 'King', 'Noble', 'Canon Formula', 'Backup', 'Wishlist', 'Retired'];
const confidenceOptions = ['Needs Review', 'Personally Tested', 'Verified', 'Imported', 'Research Needed'];

function emptyDraft(nextNumber) {
  return {
    id: `specimen-${nextNumber}-new-specimen`,
    specimenNumber: nextNumber,
    tribute: false,
    category: 'Perfume',
    type: 'Perfume',
    brand: '',
    house: '',
    maker: '',
    name: '',
    displayName: '',
    size: '',
    concentration: '',
    family: '',
    dna: '',
    role: 'Specimen',
    royalStatus: '',
    inventoryStatus: 'Active',
    reviewStatus: 'Needs Review',
    replacementStatus: '',
    bottleLevel: '',
    labConfidence: 'Needs Review',
    status: 'Needs Review',
    inspiredBy: '',
    topNotes: [],
    middleNotes: [],
    heartNotes: [],
    baseNotes: [],
    scientistNotes: '',
    notes: ''
  };
}

function NewSpecimenPage({ nextNumber, onCreate, onCancel }) {
  const [draft, setDraft] = useState(emptyDraft(nextNumber));

  React.useEffect(() => {
    setDraft(emptyDraft(nextNumber));
  }, [nextNumber]);

  const updateDraft = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }));

  const createSpecimen = () => {
    const name = draft.name.trim() || 'Untitled Specimen';
    const brand = draft.brand.trim() || draft.house.trim() || draft.maker.trim() || 'Unknown';
    const finalSpecimen = {
      ...draft,
      id: `specimen-${draft.specimenNumber}-${slugify(`${brand}-${name}`)}`,
      name,
      displayName: draft.displayName.trim() || name,
      brand,
      house: draft.house.trim() || brand,
      maker: draft.maker.trim() || brand,
      status: draft.status || draft.reviewStatus || 'Needs Review',
      inventoryStatus: draft.inventoryStatus || 'Active',
      reviewStatus: draft.reviewStatus || 'Needs Review',
      labConfidence: draft.labConfidence || 'Needs Review',
      createdInLab: true,
      createdAt: new Date().toISOString()
    };
    onCreate(finalSpecimen);
  };

  return (
    <section className="specimenPage">
      <div className="newHero">
        <div>
          <p className="eyebrow">New Specimen #{nextNumber}</p>
          <h2><Plus /> Create New Specimen</h2>
          <p>Fill in what you know now. You can always come back and edit later.</p>
        </div>
        <div className="buttonRow">
          <button className="smallButton" onClick={createSpecimen}><Save size={16} /> Create Specimen</button>
          <button className="smallButton quiet" onClick={onCancel}><X size={16} /> Cancel</button>
        </div>
      </div>

      <div className="panel">
        <h3><Edit3 /> Core Identity</h3>
        <div className="editGrid">
          <EditableField label="Specimen Number" value={draft.specimenNumber} onChange={(value) => updateDraft('specimenNumber', value)} />
          <EditableField label="Name" value={draft.name} onChange={(value) => updateDraft('name', value)} />
          <EditableField label="Display Name" value={draft.displayName} onChange={(value) => updateDraft('displayName', value)} />
          <EditableField label="Brand / House" value={draft.brand} onChange={(value) => updateDraft('brand', value)} />
          <EditableSelect label="Category" value={draft.category} onChange={(value) => updateDraft('category', value)} options={categoryOptions} />
          <EditableField label="Type" value={draft.type} onChange={(value) => updateDraft('type', value)} />
          <EditableField label="Size" value={draft.size} onChange={(value) => updateDraft('size', value)} />
          <EditableField label="Concentration" value={draft.concentration} onChange={(value) => updateDraft('concentration', value)} />
        </div>
      </div>

      <div className="panel">
        <h3><Sparkles /> DNA + Classification</h3>
        <div className="editGrid">
          <EditableField label="Family" value={draft.family} onChange={(value) => updateDraft('family', value)} />
          <EditableField label="DNA" value={draft.dna} onChange={(value) => updateDraft('dna', value)} />
          <EditableSelect label="Role" value={draft.role} onChange={(value) => updateDraft('role', value)} options={roleOptions} />
          <EditableField label="Royal Status" value={draft.royalStatus} onChange={(value) => updateDraft('royalStatus', value)} />
          <EditableSelect label="Lab Confidence" value={draft.labConfidence} onChange={(value) => updateDraft('labConfidence', value)} options={confidenceOptions} />
          <EditableField label="Inspired By" value={draft.inspiredBy} onChange={(value) => updateDraft('inspiredBy', value)} />
        </div>
      </div>

      <div className="panel">
        <h3><Sparkles /> Fragrance Notes</h3>
        <p className="muted">Enter one note per line, or separate notes with commas.</p>
        <div className="editGrid">
          <EditableField label="Top Notes" value={notesToText(draft.topNotes)} multiline onChange={(value) => updateDraft('topNotes', textToNotes(value))} />
          <EditableField label="Middle / Heart Notes" value={notesToText(draft.middleNotes || draft.heartNotes)} multiline onChange={(value) => {
            updateDraft('middleNotes', textToNotes(value));
            updateDraft('heartNotes', textToNotes(value));
          }} />
          <EditableField label="Base Notes" value={notesToText(draft.baseNotes)} multiline onChange={(value) => updateDraft('baseNotes', textToNotes(value))} />
        </div>
      </div>

      <div className="panel">
        <h3><ClipboardList /> Status + Notes</h3>
        <div className="editGrid">
          <EditableSelect label="Status" value={draft.status} onChange={(value) => updateDraft('status', value)} options={statusOptions} />
          <EditableSelect label="Inventory Status" value={draft.inventoryStatus} onChange={(value) => updateDraft('inventoryStatus', value)} options={statusOptions} />
          <EditableSelect label="Review Status" value={draft.reviewStatus} onChange={(value) => updateDraft('reviewStatus', value)} options={statusOptions} />
          <EditableField label="Bottle Level" type="number" value={draft.bottleLevel} onChange={(value) => updateDraft('bottleLevel', value)} />
          <EditableField label="Scientist Notes" value={draft.scientistNotes} multiline onChange={(value) => updateDraft('scientistNotes', value)} />
          <EditableField label="Lab Notes" value={draft.notes} multiline onChange={(value) => updateDraft('notes', value)} />
        </div>
      </div>
    </section>
  );
}

function SpecimenPage({ specimen, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(specimen);

  React.useEffect(() => {
    setDraft(specimen);
    setEditing(false);
  }, [specimen?.id]);

  if (!specimen) return null;

  const updateDraft = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }));

  const saveDraft = () => {
    const normalized = {
      ...draft,
      displayName: draft.displayName || draft.name,
      house: draft.house || draft.brand,
      maker: draft.maker || draft.brand
    };
    onSave(normalized);
    setEditing(false);
  };

  const cancelDraft = () => {
    setDraft(specimen);
    setEditing(false);
  };

  const resetLocalEditsForThisSpecimen = () => {
    const original = specimensData.find((item) => item.id === specimen.id);
    if (original) {
      onSave(original);
      setDraft(original);
      setEditing(false);
    }
  };

  const shown = editing ? draft : specimen;

  return (
    <section className="specimenPage">
      <div className="specimenHero">
        <div className="specimenBottle">
          <Droplets size={46} />
          <span>{categoryOf(shown)}</span>
        </div>

        <div className="specimenTitle">
          <p className="eyebrow">{labelFor(shown)}</p>
          {editing ? (
            <div className="heroEdit">
              <EditableField label="Name" value={draft.name} onChange={(value) => updateDraft('name', value)} />
              <EditableField label="Display Name" value={draft.displayName} onChange={(value) => updateDraft('displayName', value)} />
              <EditableField label="Brand / House" value={draft.brand || draft.house || draft.maker} onChange={(value) => updateDraft('brand', value)} />
            </div>
          ) : (
            <>
              <h2>{shown.displayName || shown.name}</h2>
              <p>{brandOf(shown)} · {shown.type || categoryOf(shown)}</p>
            </>
          )}

          <div className="buttonRow">
            {editing ? (
              <>
                <button className="smallButton" onClick={saveDraft}><Save size={16} /> Save</button>
                <button className="smallButton quiet" onClick={cancelDraft}><X size={16} /> Cancel</button>
              </>
            ) : (
              <>
                <button className="smallButton" onClick={() => setEditing(true)}><Edit3 size={16} /> Edit</button>
                <button className="smallButton quiet" onClick={resetLocalEditsForThisSpecimen}><RotateCcw size={16} /> Reset This</button>
              </>
            )}
          </div>

          <div>
            <Chip tone={isTribute(shown) ? 'gold' : ''}>{isTribute(shown) ? 'Tribute Specimen' : shown.role}</Chip>
            <Chip>{shown.status || shown.reviewStatus}</Chip>
            <Chip>{shown.category}</Chip>
          </div>
        </div>
      </div>

      {editing ? (
        <>
          <div className="panel">
            <h3><Edit3 /> Core Identity</h3>
            <div className="editGrid">
              <EditableField label="Specimen Number" value={draft.specimenNumber} onChange={(value) => updateDraft('specimenNumber', value)} />
              <EditableSelect label="Category" value={draft.category} onChange={(value) => updateDraft('category', value)} options={categoryOptions} />
              <EditableField label="Type" value={draft.type} onChange={(value) => updateDraft('type', value)} />
              <EditableField label="Size" value={draft.size} onChange={(value) => updateDraft('size', value)} />
              <EditableField label="Concentration" value={draft.concentration} onChange={(value) => updateDraft('concentration', value)} />
              <EditableField label="Inspired By" value={draft.inspiredBy} onChange={(value) => updateDraft('inspiredBy', value)} />
            </div>
          </div>

          <div className="panel">
            <h3><Sparkles /> DNA + Classification</h3>
            <div className="editGrid">
              <EditableField label="Family" value={draft.family} onChange={(value) => updateDraft('family', value)} />
              <EditableField label="DNA" value={draft.dna} onChange={(value) => updateDraft('dna', value)} />
              <EditableSelect label="Role" value={draft.role} onChange={(value) => updateDraft('role', value)} options={roleOptions} />
              <EditableField label="Royal Status" value={draft.royalStatus} onChange={(value) => updateDraft('royalStatus', value)} />
              <EditableSelect label="Lab Confidence" value={draft.labConfidence} onChange={(value) => updateDraft('labConfidence', value)} options={confidenceOptions} />
              <EditableField label="Bottle Level" type="number" value={draft.bottleLevel} onChange={(value) => updateDraft('bottleLevel', value)} />
            </div>
          </div>

          <div className="panel">
            <h3><ClipboardList /> Status</h3>
            <div className="editGrid">
              <EditableSelect label="Status" value={draft.status} onChange={(value) => updateDraft('status', value)} options={statusOptions} />
              <EditableSelect label="Inventory Status" value={draft.inventoryStatus} onChange={(value) => updateDraft('inventoryStatus', value)} options={statusOptions} />
              <EditableSelect label="Review Status" value={draft.reviewStatus} onChange={(value) => updateDraft('reviewStatus', value)} options={statusOptions} />
              <EditableField label="Replacement Status" value={draft.replacementStatus} onChange={(value) => updateDraft('replacementStatus', value)} />
            </div>
          </div>

          <div className="panel">
            <h3><Sparkles /> Fragrance Notes</h3>
            <p className="muted">Enter one note per line, or separate notes with commas.</p>
            <div className="editGrid">
              <EditableField label="Top Notes" value={notesToText(draft.topNotes)} multiline onChange={(value) => updateDraft('topNotes', textToNotes(value))} />
              <EditableField label="Middle / Heart Notes" value={notesToText(draft.middleNotes || draft.heartNotes)} multiline onChange={(value) => {
                updateDraft('middleNotes', textToNotes(value));
                updateDraft('heartNotes', textToNotes(value));
              }} />
              <EditableField label="Base Notes" value={notesToText(draft.baseNotes)} multiline onChange={(value) => updateDraft('baseNotes', textToNotes(value))} />
            </div>
          </div>

          <div className="panel">
            <h3><Heart /> Notes</h3>
            <div className="editGrid">
              <EditableField label="Scientist Notes" value={draft.scientistNotes} multiline onChange={(value) => updateDraft('scientistNotes', value)} />
              <EditableField label="Lab Notes" value={draft.notes} multiline onChange={(value) => updateDraft('notes', value)} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="specimenGrid">
            <Field label="Specimen Number" value={specimenNumber(shown)} />
            <Field label="Category" value={shown.category} />
            <Field label="Type" value={shown.type} />
            <Field label="Size" value={shown.size} />
            <Field label="Concentration" value={shown.concentration} />
            <Field label="Brand / House" value={brandOf(shown)} />
            <Field label="Family" value={shown.family} />
            <Field label="DNA" value={shown.dna} />
            <Field label="Role" value={shown.role} />
            <Field label="Royal Status" value={shown.royalStatus} />
            <Field label="Inventory Status" value={shown.inventoryStatus} />
            <Field label="Review Status" value={shown.reviewStatus} />
            <Field label="Replacement Status" value={shown.replacementStatus} />
            <Field label="Bottle Level" value={shown.bottleLevel ? `${shown.bottleLevel}%` : ''} />
            <Field label="Lab Confidence" value={shown.labConfidence} />
            <Field label="Inspired By" value={shown.inspiredBy} />
          </div>

          <div className="panel">
            <h3><Sparkles /> Fragrance Notes</h3>
            <div className="fragrancePyramid">
              <NotesDisplay title="Top Notes" notes={shown.topNotes} tone="top" />
              <NotesDisplay title="Middle / Heart Notes" notes={shown.middleNotes || shown.heartNotes} tone="middle" />
              <NotesDisplay title="Base Notes" notes={shown.baseNotes} tone="base" />
            </div>
          </div>

          <div className="panel">
            <h3><ClipboardList /> Lead Scientist Notes</h3>
            <p>{shown.scientistNotes || 'No scientist notes yet.'}</p>
          </div>

          <div className="panel">
            <h3><Heart /> Lab Notes</h3>
            <p>{shown.notes || 'No notes yet.'}</p>
          </div>
        </>
      )}
    </section>
  );
}

function BenchPage({ specimens, bench, onBenchChange, onSaveFormula, onResetBench }) {
  const bodyCare = specimens.filter(isBodyCare);
  const oils = specimens.filter(isOil);
  const perfumes = specimens.filter(isPerfume);

  const selected = {
    bodyCare: byId(specimens, bench.bodyCare),
    oil: byId(specimens, bench.oil),
    fragrance1: byId(specimens, bench.fragrance1),
    fragrance2: byId(specimens, bench.fragrance2),
    fragrance3: byId(specimens, bench.fragrance3)
  };

  const selectedList = Object.values(selected).filter(Boolean);
  const suggestedName = bench.formulaName || selectedList.map(nameOf).join(' + ');

  return (
    <section>
      <div className="sectionTitle">
        <h2><Beaker /> Bench Formula Builder</h2>
        <div className="buttonRow">
          <button className="smallButton" onClick={onSaveFormula}><Save size={16} /> Save Formula</button>
          <button className="smallButton quiet" onClick={onResetBench}><RotateCcw size={16} /> Clear Bench</button>
        </div>
      </div>

      <div className="panel">
        <h3><FlaskConical /> Formula Identity</h3>
        <div className="editGrid">
          <EditableField label="Formula Name" value={bench.formulaName} onChange={(value) => onBenchChange('formulaName', value)} />
          <EditableField label="Verdict / Vibe" value={bench.verdict} onChange={(value) => onBenchChange('verdict', value)} />
          <EditableField label="Scientist Notes" value={bench.notes} multiline onChange={(value) => onBenchChange('notes', value)} />
        </div>
      </div>

      <div className="panel">
        <h3><Droplets /> Build The Stack</h3>
        <div className="editGrid">
          <SpecimenSelect label="Body Care" value={bench.bodyCare} specimens={bodyCare} onChange={(value) => onBenchChange('bodyCare', value)} />
          <SpecimenSelect label="Oil" value={bench.oil} specimens={oils} onChange={(value) => onBenchChange('oil', value)} />
          <SpecimenSelect label="Perfume 1" value={bench.fragrance1} specimens={perfumes} onChange={(value) => onBenchChange('fragrance1', value)} />
          <SpecimenSelect label="Perfume 2" value={bench.fragrance2} specimens={perfumes} onChange={(value) => onBenchChange('fragrance2', value)} />
          <SpecimenSelect label="Perfume 3" value={bench.fragrance3} specimens={perfumes} onChange={(value) => onBenchChange('fragrance3', value)} />
        </div>
      </div>

      <div className="panel">
        <h3><ClipboardList /> Bench Preview</h3>
        <p className="formulaName">{suggestedName || 'No formula assembled yet.'}</p>
        <div className="formulaGrid">
          {['bodyCare', 'oil', 'fragrance1', 'fragrance2', 'fragrance3'].map((slot) => (
            <div className="formulaSlot" key={slot}>
              <div className="label">{slot.replace('fragrance', 'perfume ').replace('bodyCare', 'body care')}</div>
              {selected[slot] ? (
                <>
                  <strong>{nameOf(selected[slot])}</strong>
                  <span>{brandOf(selected[slot])}</span>
                  <Chip>{categoryOf(selected[slot])}</Chip>
                </>
              ) : (
                <span className="muted">Empty</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportsPage({ reports, specimens, onOpenReport }) {
  return (
    <section>
      <h2><Sparkles /> Lab Reports</h2>
      {reports.length === 0 ? (
        <div className="panel">
          <p>No formulas saved yet. Build your first formula on the Bench.</p>
        </div>
      ) : (
        <div className="grid">
          {reports.map((report) => (
            <article className="specimenCard" key={report.id} onClick={() => onOpenReport(report.id)}>
              <p className="specimenNumber">Lab Report · {new Date(report.createdAt).toLocaleDateString()}</p>
              <h3>{report.name}</h3>
              <p>{report.verdict || 'No verdict yet.'}</p>
              <div>
                {formulaItems(report).map((id) => {
                  const item = byId(specimens, id);
                  return <Chip key={id}>{item ? nameOf(item) : id}</Chip>;
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function App() {
  const [state, setState] = useState(loadState);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [quickFilter, setQuickFilter] = useState('All');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [compareLeft, setCompareLeft] = useState('');
  const [compareRight, setCompareRight] = useState('');

  const updateState = (next) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const selectedSpecimen = state.specimens.find((specimen) => specimen.id === state.selectedId) || state.specimens[0];

  const counts = useMemo(() => {
    const total = state.specimens.length;
    const bodyCare = state.specimens.filter((s) => categoryOf(s).toLowerCase().includes('body')).length;
    const oils = state.specimens.filter((s) => categoryOf(s).toLowerCase().includes('oil')).length;
    const perfumes = state.specimens.filter((s) => categoryOf(s).toLowerCase().includes('perfume')).length;
    const needsReview = state.specimens.filter((s) => (s.status || s.reviewStatus || '').toLowerCase().includes('review')).length;
    return { total, bodyCare, oils, perfumes, needsReview };
  }, [state.specimens]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(state.specimens.map(categoryOf))).filter(Boolean).sort()], [state.specimens]);
  const statuses = useMemo(() => ['All', ...Array.from(new Set(state.specimens.map((s) => s.status || s.reviewStatus).filter(Boolean))).sort()], [state.specimens]);

  const filteredSpecimens = state.specimens.filter((specimen) => {
    const matchesQuery = matchesSmartQuery(specimen, query);
    const matchesQuick = matchesQuickFilter(specimen, quickFilter);
    const matchesCategory = categoryFilter === 'All' || categoryOf(specimen) === categoryFilter;
    const specimenStatus = specimen.status || specimen.reviewStatus || '';
    const matchesStatus = statusFilter === 'All' || specimenStatus === statusFilter;
    return matchesQuery && matchesQuick && matchesCategory && matchesStatus;
  });

  const saveSpecimen = (updatedSpecimen) => {
    const nextSpecimens = state.specimens.map((specimen) => specimen.id === updatedSpecimen.id ? updatedSpecimen : specimen);
    updateState({ ...state, specimens: nextSpecimens, selectedId: updatedSpecimen.id });
  };

  const createSpecimen = (newSpecimen) => {
    updateState({
      ...state,
      specimens: [newSpecimen, ...state.specimens],
      selectedId: newSpecimen.id,
      screen: 'specimen'
    });
  };

  const updateBench = (key, value) => {
    updateState({
      ...state,
      bench: {
        ...state.bench,
        [key]: value
      }
    });
  };

  const resetBench = () => {
    updateState({
      ...state,
      bench: starterState().bench
    });
  };

  const saveFormula = () => {
    const chosenIds = formulaItems(state.bench);
    const chosenSpecimens = chosenIds.map((id) => byId(state.specimens, id)).filter(Boolean);
    if (chosenSpecimens.length === 0) return;

    const reportName = state.bench.formulaName.trim() || chosenSpecimens.map(nameOf).join(' + ');
    const report = {
      id: `report-${Date.now()}-${slugify(reportName)}`,
      name: reportName,
      createdAt: new Date().toISOString(),
      bodyCare: state.bench.bodyCare,
      oil: state.bench.oil,
      fragrance1: state.bench.fragrance1,
      fragrance2: state.bench.fragrance2,
      fragrance3: state.bench.fragrance3,
      notes: state.bench.notes,
      verdict: state.bench.verdict,
      status: 'Draft Lab Report'
    };

    updateState({
      ...state,
      reports: [report, ...(state.reports || [])],
      screen: 'reports'
    });
  };

  const setScreen = (screen) => updateState({ ...state, screen });

  const chooseSpecimen = (specimen) => updateState({ ...state, selectedId: specimen.id, screen: 'specimen' });

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'the-frag-lab-editable-backup.json';
    anchor.click();
  };

  return (
    <div className="app">
      <header className={headerCollapsed ? 'collapsed' : ''}>
        <div className="topBar">
          <div className="brandRow">
            <div className="logo"><FlaskConical size={26} /></div>
            <div>
              <h1>The Frag Lab</h1>
              {!headerCollapsed && <p>Explore the DNA. Preserve the Royals.</p>}
            </div>
          </div>

          <button className="collapseButton" onClick={() => setHeaderCollapsed(!headerCollapsed)}>
            {headerCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            {headerCollapsed ? 'Open' : 'Hide'}
          </button>
        </div>

        {!headerCollapsed && (
          <blockquote>The Canon isn't someone else's opinion. It's your proven knowledge.</blockquote>
        )}
      </header>

      <main>
        {state.screen === 'specimens' && (
          <section>
            <div className="sectionTitle">
              <h2><Database /> Specimen Database</h2>
              <button className="smallButton" onClick={() => setScreen('newSpecimen')}><Plus size={16} /> New Specimen</button>
            </div>

            <div className="stats">
              <div><strong>{counts.total}</strong><span>Total</span></div>
              <div><strong>{counts.bodyCare}</strong><span>Body Care</span></div>
              <div><strong>{counts.oils}</strong><span>Oils</span></div>
              <div><strong>{counts.perfumes}</strong><span>Perfumes</span></div>
              <div><strong>{counts.needsReview}</strong><span>Needs Review</span></div>
            </div>

            <div className="smartSearchPanel">
              <div className="search">
                <Search size={18} />
                <input
                  value={query}
                  placeholder="Smart search: try 'bbw vanilla', 'cherry oil', 'soldier marshmallow'..."
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && <button className="tinyButton" onClick={() => setQuery('')}>Clear</button>}
              </div>

              <div className="quickFilters">
                {quickFilters.map((filter) => (
                  <button
                    key={filter}
                    className={`filterChip ${quickFilter === filter ? 'active' : ''}`}
                    onClick={() => setQuickFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <p className="searchSummary">
                Showing <strong>{filteredSpecimens.length}</strong> of <strong>{state.specimens.length}</strong> specimens
                {query ? <> for <strong>"{query}"</strong></> : null}
                {quickFilter !== 'All' ? <> in <strong>{quickFilter}</strong></> : null}
              </p>
            </div>

            <div className="filterRow">
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>

            {filteredSpecimens.length === 0 ? (
              <div className="emptyState">
                <FlaskConical size={34} />
                <h3>No specimens matched</h3>
                <p>Try a broader search like cherry, vanilla, BBW, marshmallow, oil, or queen.</p>
                <button className="smallButton" onClick={() => {
                  setQuery('');
                  setQuickFilter('All');
                  setCategoryFilter('All');
                  setStatusFilter('All');
                }}>
                  Reset Search
                </button>
              </div>
            ) : (
              <div className="grid">
                {filteredSpecimens.slice(0, 200).map((specimen) => (
                  <SpecimenCard
                    key={specimen.id}
                    specimen={specimen}
                    selected={specimen.id === state.selectedId}
                    onClick={() => chooseSpecimen(specimen)}
                  />
                ))}
              </div>
            )}

            {filteredSpecimens.length > 200 && (
              <p className="muted">Showing first 200 results. Search or filter to narrow the database.</p>
            )}
          </section>
        )}

        {state.screen === 'newSpecimen' && (
          <NewSpecimenPage
            nextNumber={nextSpecimenNumber(state.specimens)}
            onCreate={createSpecimen}
            onCancel={() => setScreen('specimens')}
          />
        )}

        {state.screen === 'specimen' && (
          <SpecimenPage specimen={selectedSpecimen} onSave={saveSpecimen} />
        )}

        {state.screen === 'bench' && (
          <BenchPage
            specimens={state.specimens}
            bench={state.bench}
            onBenchChange={updateBench}
            onSaveFormula={saveFormula}
            onResetBench={resetBench}
          />
        )}

        {state.screen === 'canon' && (
          <section>
            <h2><BookOpen /> Canon</h2>
            <p>Canon formulas will link to editable specimens in the next build.</p>
            <div className="panel">
              <p>Saved Lab Reports: <strong>{(state.reports || []).length}</strong></p>
            </div>
          </section>
        )}

        {state.screen === 'reports' && (
          <ReportsPage reports={state.reports || []} specimens={state.specimens} />
        )}

        {state.screen === 'compare' && (
          <ComparePage
            specimens={state.specimens}
            leftId={compareLeft}
            rightId={compareRight}
            setLeftId={setCompareLeft}
            setRightId={setCompareRight}
          />
        )}

        {state.screen === 'wonder' && (
          <section>
            <h2>💡 I Wonder...</h2>
            <p>Future hypotheses and layering ideas will live here.</p>
          </section>
        )}

        <button className="secondary" onClick={exportBackup}>Export Backup</button>
      </main>

      <nav>
        <button className={state.screen === 'specimens' ? 'active' : ''} onClick={() => setScreen('specimens')}>Specimens</button>
        <button className={state.screen === 'bench' ? 'active' : ''} onClick={() => setScreen('bench')}>Bench</button>
        <button className={state.screen === 'canon' ? 'active' : ''} onClick={() => setScreen('canon')}>Canon</button>
        <button className={state.screen === 'reports' ? 'active' : ''} onClick={() => setScreen('reports')}>Reports</button>
        <button className={state.screen === 'compare' ? 'active' : ''} onClick={() => setScreen('compare')}>Compare</button>
        <button className={state.screen === 'wonder' ? 'active' : ''} onClick={() => setScreen('wonder')}>Wonder</button>
      </nav>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
