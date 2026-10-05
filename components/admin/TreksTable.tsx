'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  PlusCircle,
  Trash,
  Check,
  Calendar,
  Mountain,
  UploadCloud,
} from 'lucide-react';
import type { FullTrek } from '@/lib/treks';
import type { ItineraryDay } from '@/lib/trek-detail-data';

const SECTION_OPTIONS = [
  { id: 'winter-treks', label: 'Winter Treks' },
  { id: 'summer-treks', label: 'Summer Treks' },
  { id: 'monsoon-treks', label: 'Monsoon Treks' },
  { id: 'village-tour', label: 'Village Tours' },
  { id: 'international-trek', label: 'International Treks' },
  { id: 'autumn-treks', label: 'Autumn Treks' },
  { id: 'expedition', label: 'Expeditions' },
  { id: 'bike-tour', label: 'Bike Tours' },
  { id: 'spiritual-yatra', label: 'Spiritual Yatras' },
  { id: 'weekend-getaways', label: 'Weekend Getaways' },
  { id: 'upcoming-treks', label: 'Upcoming Treks' },
];

const DIFFICULTY_OPTIONS = [
  'Easy',
  'Easy to Moderate',
  'Moderate',
  'Moderate to Difficult',
  'Difficult',
];

const EMPTY_FORM: Omit<FullTrek, '_id' | 'id'> = {
  name: '',
  slug: '',
  origin: 'Ex Dehradun to Dehradun',
  days: 5,
  difficulty: 'Easy',
  image: '',
  sections: ['winter-treks'],
  region: 'Uttarakhand, India',
  maxAltitude: '12,500 Ft',
  trekkingKm: '20 Kms',
  pickupPoint: 'Dehradun Railway Station',
  dropPoint: 'Dehradun Railway Station',
  baseCamp: 'Sankri',
  food: 'Veg Meals',
  stay: 'Camping / Homestay',
  bestSeason: 'All Year',
  pricePerPerson: '₹ 5,499',
  priceStrikethrough: '₹ 7,500',
  discountBadge: '25% OFF',
  pdfUrl: '',
  highlights: [],
  whoCanParticipate: [],
  itinerary: [
    {
      day: 1,
      title: 'Drive from Dehradun to Basecamp',
      description: ['Drive through scenic mountain roads to reach base camp.'],
      altitude: '6,400 ft',
      distance: '200 km drive',
    },
  ],
};

export default function TreksTable() {
  const [treks, setTreks] = useState<FullTrek[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrek, setEditingTrek] = useState<FullTrek | null>(null);
  const [formData, setFormData] = useState<Omit<FullTrek, '_id' | 'id'>>(EMPTY_FORM);

  // Form tab & helper states
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'highlights' | 'itinerary'>('basic');
  const [saving, setSaving] = useState(false);

  // Temporary input helpers for bullet lists
  const [newHighlight, setNewHighlight] = useState('');

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setUploadError(null);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError('Image is too large. Please choose a photo up to 3MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('slug', formData.slug || 'trek');

      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data: { error?: unknown; url?: unknown } | null = await res.json().catch(() => null);

      if (!res.ok) {
        const serverMessage = typeof data?.error === 'string' ? data.error : null;
        throw new Error(serverMessage || 'Unable to upload image. Please try again.');
      }
      if (typeof data?.url !== 'string' || !data.url) {
        throw new Error('The upload completed without an image URL. Please try again.');
      }

      setFormData((prev) => ({ ...prev, image: data.url as string }));
    } catch (err) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchTreks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sectionFilter !== 'all') params.set('section', sectionFilter);

      const res = await fetch(`/api/admin/treks?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load treks');
      const data = await res.json();
      setTreks(data.treks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, sectionFilter]);

  useEffect(() => {
    fetchTreks();
  }, [fetchTreks]);

  const handleOpenAdd = () => {
    setEditingTrek(null);
    setFormData(EMPTY_FORM);
    setActiveTab('basic');
    setUploadError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (trek: FullTrek) => {
    setEditingTrek(trek);
    setFormData({
      name: trek.name || '',
      slug: trek.slug || '',
      origin: trek.origin || '',
      days: trek.days || 1,
      difficulty: trek.difficulty || 'Easy',
      image: trek.image || '',
      note: trek.note || '',
      sections: trek.sections || ['winter-treks'],
      region: trek.region || '',
      maxAltitude: trek.maxAltitude || '',
      trekkingKm: trek.trekkingKm || '',
      pickupPoint: trek.pickupPoint || '',
      dropPoint: trek.dropPoint || '',
      baseCamp: trek.baseCamp || '',
      food: trek.food || '',
      stay: trek.stay || '',
      bestSeason: trek.bestSeason || '',
      pricePerPerson: trek.pricePerPerson || '',
      priceStrikethrough: trek.priceStrikethrough || '',
      discountBadge: trek.discountBadge || '',
      pdfUrl: trek.pdfUrl || '',
      highlights: trek.highlights || [],
      whoCanParticipate: trek.whoCanParticipate || [],
      itinerary: trek.itinerary || [],
    });
    setActiveTab('basic');
    setUploadError(null);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/treks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTreks((prev) => prev.filter((t) => t._id !== id));
      } else {
        alert('Failed to delete trek');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting trek');
    }
  };

  const handleSeed = async () => {
    if (
      !window.confirm(
        'This deletes ALL current treks — including every price, image, and PDF edit you\'ve made — and replaces them with the original starter set. This cannot be undone. Continue?'
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/treks/seed', { method: 'POST' });
      if (res.ok) {
        await fetchTreks();
        alert('Successfully seeded default treks!');
      } else {
        alert('Failed to seed treks');
      }
    } catch (err) {
      console.error(err);
      alert('Error seeding treks');
    } finally {
      setLoading(false);
    }
  };

  const handleSlugifyName = () => {
    if (!formData.name) return;
    const generated = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    setFormData((prev) => ({ ...prev, slug: generated }));
  };

  const toggleSection = (sectionId: string) => {
    setFormData((prev) => {
      const current = prev.sections || [];
      if (current.includes(sectionId)) {
        return { ...prev, sections: current.filter((s) => s !== sectionId) };
      }
      return { ...prev, sections: [...current, sectionId] };
    });
  };

  // Highlights handlers
  const addHighlight = () => {
    if (!newHighlight.trim()) return;
    setFormData((prev) => ({
      ...prev,
      highlights: [...(prev.highlights || []), newHighlight.trim()],
    }));
    setNewHighlight('');
  };

  const removeHighlight = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      highlights: prev.highlights?.filter((_, i) => i !== index),
    }));
  };

  // Itinerary Handlers
  const addItineraryDay = () => {
    setFormData((prev) => {
      const current = prev.itinerary || [];
      const nextDayNum = current.length + 1;
      return {
        ...prev,
        itinerary: [
          ...current,
          {
            day: nextDayNum,
            title: `Day ${nextDayNum} Trek`,
            description: ['Details for this day...'],
            altitude: '',
            distance: '',
          },
        ],
      };
    });
  };

  const updateItineraryDay = (index: number, field: keyof ItineraryDay, value: string | string[]) => {
    setFormData((prev) => {
      const updated = [...(prev.itinerary || [])];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return { ...prev, itinerary: updated };
    });
  };

  const removeItineraryDay = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      itinerary: prev.itinerary?.filter((_, i) => i !== index).map((day, i) => ({ ...day, day: i + 1 })),
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      alert('Please enter Name and Slug');
      return;
    }
    if (!formData.image) {
      setActiveTab('basic');
      alert('Please upload a trek card image before saving');
      return;
    }

    setSaving(true);
    try {
      if (editingTrek && editingTrek._id) {
        const res = await fetch(`/api/admin/treks/${editingTrek._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Failed to update');
      } else {
        const res = await fetch('/api/admin/treks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Failed to create');
      }

      setModalOpen(false);
      fetchTreks();
    } catch (err) {
      console.error(err);
      alert('Failed to save trek details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-treks-container">
      {/* Top Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-search">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search treks by name, slug, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input-search"
            />
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="admin-select-filter"
          >
            <option value="all">All Categories ({SECTION_OPTIONS.length})</option>
            {SECTION_OPTIONS.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-toolbar-actions">
          <button onClick={handleOpenAdd} className="btn-primary-admin">
            <Plus size={18} />
            <span>Add New Trek</span>
          </button>
        </div>
      </div>

      {/* Treks Table */}
      {loading ? (
        <div className="admin-loading-state">
          <RefreshCw className="spin-icon" size={24} />
          <span>Loading treks list...</span>
        </div>
      ) : treks.length === 0 ? (
        <div className="admin-empty-state">
          <Mountain size={48} />
          <h3>No Treks Found</h3>
          <p>Try clearing your search filters, click &quot;Add New Trek&quot; to create one, or load the original starter treks below.</p>
          {!search && sectionFilter === 'all' && (
            <button onClick={handleSeed} className="btn-secondary-admin" title="Load the original starter trek list">
              <RefreshCw size={16} />
              <span>Load Starter Treks</span>
            </button>
          )}
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Trek</th>
                <th>Categories / Sections</th>
                <th>Days</th>
                <th>Difficulty</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {treks.map((t) => (
                <tr key={t._id || t.slug}>
                  <td>
                    <div className="admin-trek-cell">
                      <div className="admin-trek-thumb">
                        <Image
                          src={t.image || '/treks-cards-images/kedarkantha-trek.jpg'}
                          alt={t.name}
                          width={50}
                          height={40}
                          className="object-cover rounded"
                        />
                      </div>
                      <div>
                        <div className="admin-trek-name">{t.name}</div>
                        <div className="admin-trek-slug">/{t.slug} • {t.origin}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="admin-tags-list">
                      {t.sections?.map((secId) => {
                        const secLabel = SECTION_OPTIONS.find((s) => s.id === secId)?.label || secId;
                        return (
                          <span key={secId} className="admin-tag">
                            {secLabel}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td>{t.days} Days</td>
                  <td>
                    <span className="difficulty-badge">{t.difficulty}</span>
                  </td>
                  <td>
                    <div className="admin-price-cell">
                      <strong>{t.pricePerPerson || 'N/A'}</strong>
                      {t.priceStrikethrough && (
                        <span className="strikethrough">{t.priceStrikethrough}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="admin-actions-cell">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="btn-action-edit"
                        title="Edit Trek"
                      >
                        <Edit2 size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => t._id && handleDelete(t._id, t.name)}
                        className="btn-action-delete"
                        title="Delete Trek"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tucked-away danger zone — deliberately not in the main toolbar since this wipes all trek edits */}
      {!loading && treks.length > 0 && (
        <details className="admin-danger-zone">
          <summary>Advanced</summary>
          <div className="admin-danger-zone-body">
            <p>Reset every trek back to the original starter list. This deletes all current treks, including any price, image, or PDF edits you&apos;ve made.</p>
            <button onClick={handleSeed} className="btn-danger-admin">
              <RefreshCw size={14} />
              <span>Reset to Starter Treks</span>
            </button>
          </div>
        </details>
      )}

      {/* Add / Edit Trek Modal */}
      {modalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h2>{editingTrek ? `Edit Trek: ${editingTrek.name}` : 'Add New Trek'}</h2>
              <button onClick={() => setModalOpen(false)} className="btn-close-modal">
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="admin-modal-tabs">
              <button
                className={`modal-tab ${activeTab === 'basic' ? 'active' : ''}`}
                onClick={() => setActiveTab('basic')}
              >
                1. Basic & Pricing
              </button>
              <button
                className={`modal-tab ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                2. Overview & Details
              </button>
              <button
                className={`modal-tab ${activeTab === 'highlights' ? 'active' : ''}`}
                onClick={() => setActiveTab('highlights')}
              >
                3. Highlights ({formData.highlights?.length || 0})
              </button>
              <button
                className={`modal-tab ${activeTab === 'itinerary' ? 'active' : ''}`}
                onClick={() => setActiveTab('itinerary')}
              >
                4. Itinerary ({formData.itinerary?.length || 0} Days)
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="admin-modal-body">
              {/* TAB 1: BASIC & PRICING */}
              {activeTab === 'basic' && (
                <div className="form-tab-content">
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Trek Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Kedarkantha Trek"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Slug (URL identifier) *
                        <button
                          type="button"
                          onClick={handleSlugifyName}
                          className="btn-text-action"
                        >
                          Generate from Name
                        </button>
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="e.g. kedarkantha-trek"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>Origin / Starting Route</label>
                      <input
                        type="text"
                        value={formData.origin}
                        onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                        placeholder="Ex Dehradun to Dehradun"
                      />
                    </div>

                    <div className="form-group">
                      <label>Duration (Days)</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={formData.days}
                        onChange={(e) => setFormData({ ...formData, days: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Difficulty</label>
                      <select
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      >
                        {DIFFICULTY_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>Price Per Person</label>
                      <input
                        type="text"
                        value={formData.pricePerPerson}
                        onChange={(e) => setFormData({ ...formData, pricePerPerson: e.target.value })}
                        placeholder="₹ 5,499"
                      />
                    </div>

                    <div className="form-group">
                      <label>Original Price (Strikethrough)</label>
                      <input
                        type="text"
                        value={formData.priceStrikethrough}
                        onChange={(e) => setFormData({ ...formData, priceStrikethrough: e.target.value })}
                        placeholder="₹ 7,500"
                      />
                    </div>

                    <div className="form-group">
                      <label>Discount Badge Text</label>
                      <input
                        type="text"
                        value={formData.discountBadge}
                        onChange={(e) => setFormData({ ...formData, discountBadge: e.target.value })}
                        placeholder="25% OFF"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Trek Card Image (one photo, up to 3MB) {!formData.image && '*'}</label>
                    <div className="image-upload-row">
                      <div className="image-upload-preview">
                        {formData.image ? (
                          <Image
                            src={formData.image}
                            alt="Trek image preview"
                            width={90}
                            height={70}
                            unoptimized
                            className="object-cover rounded"
                          />
                        ) : (
                          <div className="image-upload-preview-empty">No image yet</div>
                        )}
                      </div>
                      <div className="image-upload-controls">
                        <label className="btn-secondary-admin image-upload-btn">
                          <UploadCloud size={16} />
                          <span>{uploadingImage ? 'Uploading...' : formData.image ? 'Replace Photo' : 'Upload Photo'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageFileChange}
                            disabled={uploadingImage}
                            hidden
                          />
                        </label>
                        <p className="form-hint-text">
                          Click to choose a photo from your device — it uploads automatically and this trek&apos;s image is set for you. No file path or URL needed.
                        </p>
                        <details className="advanced-image-url">
                          <summary>Advanced: use an image URL instead</summary>
                          <input
                            type="text"
                            value={formData.image}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            placeholder="https://example.com/photo.jpg"
                          />
                        </details>
                      </div>
                    </div>
                    {uploadError && <p className="form-error-text">{uploadError}</p>}
                    {!formData.image && (
                      <p className="form-error-text">Please upload a photo for this trek before saving.</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Categories / Sections (Select all that apply)</label>
                    <div className="checkbox-grid">
                      {SECTION_OPTIONS.map((sec) => {
                        const checked = formData.sections?.includes(sec.id) || false;
                        return (
                          <label key={sec.id} className="checkbox-item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSection(sec.id)}
                            />
                            <span>{sec.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OVERVIEW & DETAILS */}
              {activeTab === 'details' && (
                <div className="form-tab-content">
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Region / Location</label>
                      <input
                        type="text"
                        value={formData.region}
                        onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                        placeholder="Sankri, Uttarakhand"
                      />
                    </div>

                    <div className="form-group">
                      <label>Max Altitude</label>
                      <input
                        type="text"
                        value={formData.maxAltitude}
                        onChange={(e) => setFormData({ ...formData, maxAltitude: e.target.value })}
                        placeholder="12,500 Ft"
                      />
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>Trekking Distance</label>
                      <input
                        type="text"
                        value={formData.trekkingKm}
                        onChange={(e) => setFormData({ ...formData, trekkingKm: e.target.value })}
                        placeholder="20 Kms"
                      />
                    </div>

                    <div className="form-group">
                      <label>Basecamp</label>
                      <input
                        type="text"
                        value={formData.baseCamp}
                        onChange={(e) => setFormData({ ...formData, baseCamp: e.target.value })}
                        placeholder="Sankri"
                      />
                    </div>

                    <div className="form-group">
                      <label>Best Season</label>
                      <input
                        type="text"
                        value={formData.bestSeason}
                        onChange={(e) => setFormData({ ...formData, bestSeason: e.target.value })}
                        placeholder="Nov to April"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Pickup Location</label>
                      <input
                        type="text"
                        value={formData.pickupPoint}
                        onChange={(e) => setFormData({ ...formData, pickupPoint: e.target.value })}
                        placeholder="Dehradun Railway Station"
                      />
                    </div>

                    <div className="form-group">
                      <label>Drop Location</label>
                      <input
                        type="text"
                        value={formData.dropPoint}
                        onChange={(e) => setFormData({ ...formData, dropPoint: e.target.value })}
                        placeholder="Dehradun Railway Station"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Accommodation Info</label>
                      <input
                        type="text"
                        value={formData.stay}
                        onChange={(e) => setFormData({ ...formData, stay: e.target.value })}
                        placeholder="Guest house & Camping"
                      />
                    </div>

                    <div className="form-group">
                      <label>Meals Info</label>
                      <input
                        type="text"
                        value={formData.food}
                        onChange={(e) => setFormData({ ...formData, food: e.target.value })}
                        placeholder="All Veg Meals"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Trek Info PDF Link (Google Drive / PDF URL)</label>
                    <input
                      type="url"
                      value={formData.pdfUrl}
                      onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
                      placeholder="https://drive.google.com/..."
                    />
                    <p className="form-hint-text">
                      Powers the &quot;Download Detailed Itinerary PDF&quot; button on this trek&apos;s info page. Leave blank to hide the button.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: HIGHLIGHTS */}
              {activeTab === 'highlights' && (
                <div className="form-tab-content">
                  <div className="highlights-builder">
                    <label>Trek Highlights (Key attractions or special features)</label>
                    <div className="add-highlight-row">
                      <input
                        type="text"
                        value={newHighlight}
                        onChange={(e) => setNewHighlight(e.target.value)}
                        placeholder="e.g. 360-degree views of Swargarohini & Black Peak"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addHighlight();
                          }
                        }}
                      />
                      <button type="button" onClick={addHighlight} className="btn-secondary-admin">
                        <PlusCircle size={16} /> Add Highlight
                      </button>
                    </div>

                    <ul className="highlights-edit-list">
                      {formData.highlights?.map((hl, i) => (
                        <li key={i} className="highlight-item-edit">
                          <span>• {hl}</span>
                          <button
                            type="button"
                            onClick={() => removeHighlight(i)}
                            className="btn-delete-small"
                          >
                            <Trash size={14} />
                          </button>
                        </li>
                      ))}
                      {(!formData.highlights || formData.highlights.length === 0) && (
                        <li className="empty-highlights-note">No highlights added yet.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 4: ITINERARY */}
              {activeTab === 'itinerary' && (
                <div className="form-tab-content">
                  <div className="itinerary-builder">
                    <div className="itinerary-header-row">
                      <label>Day-by-Day Detailed Itinerary</label>
                      <button type="button" onClick={addItineraryDay} className="btn-secondary-admin">
                        <PlusCircle size={16} /> Add Day { (formData.itinerary?.length || 0) + 1 }
                      </button>
                    </div>

                    <div className="itinerary-days-list">
                      {formData.itinerary?.map((day, i) => (
                        <div key={i} className="itinerary-day-card">
                          <div className="itinerary-day-top">
                            <span className="day-number-badge">Day {day.day}</span>
                            <input
                              type="text"
                              value={day.title}
                              onChange={(e) => updateItineraryDay(i, 'title', e.target.value)}
                              placeholder="Day title e.g. Drive from Dehradun to Sankri"
                              className="day-title-input"
                            />
                            <button
                              type="button"
                              onClick={() => removeItineraryDay(i)}
                              className="btn-delete-small"
                              title="Delete this day"
                            >
                              <Trash size={14} />
                            </button>
                          </div>

                          <div className="itinerary-day-grid">
                            <div>
                              <input
                                type="text"
                                value={day.altitude || ''}
                                onChange={(e) => updateItineraryDay(i, 'altitude', e.target.value)}
                                placeholder="Altitude e.g. 6,400 ft"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                value={day.distance || ''}
                                onChange={(e) => updateItineraryDay(i, 'distance', e.target.value)}
                                placeholder="Distance e.g. 200 km drive"
                              />
                            </div>
                          </div>

                          <textarea
                            value={Array.isArray(day.description) ? day.description.join('\n') : day.description}
                            onChange={(e) =>
                              updateItineraryDay(i, 'description', e.target.value.split('\n'))
                            }
                            placeholder="Detailed description for this day (lines split into paragraphs)..."
                            rows={3}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="admin-modal-footer">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-cancel-modal">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-save-modal">
                  {saving ? 'Saving...' : editingTrek ? 'Update Trek' : 'Create Trek'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
