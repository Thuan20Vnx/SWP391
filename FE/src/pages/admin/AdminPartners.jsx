import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminDataSelect from '../../components/admin/AdminDataSelect';
import { PARTNER_FIELD_OPTIONS, emptyPartnerForm } from '../../data/adminPartnersData';
import {
  createAdminPartner,
  deleteAdminPartner,
  fetchAdminPartners,
  updateAdminPartner,
} from '../../services/adminApi';
import { getUserRole, isAdminRole } from '../../utils/auth';
import { useTranslation } from '../../i18n/I18nContext';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-accounts.css';
import '../../styles/admin-data-maintenance.css';
import '../../styles/admin-data-fields.css';
import '../../styles/admin-partners.css';

const toForm = (partner) => ({
  companyName: partner?.name || '',
  field: partner?.category || '',
  representative: partner?.representative || '',
  email: partner?.email || '',
  phone: partner?.phone || '',
  address: partner?.address || '',
  representativeTitle: partner?.representativeTitle || '',
  partnerCode: partner?.partnerCode || '',
  description: partner?.description || '',
});

const buildPayload = (form) => ({
  name: form.companyName.trim(),
  email: form.email.trim(),
  phone: form.phone.trim(),
  representative: form.representative.trim(),
  category: form.field,
  address: form.address.trim(),
  representativeTitle: form.representativeTitle.trim(),
  partnerCode: form.partnerCode.trim(),
  description: form.description.trim(),
});

const statusToneMap = {
  approved: 'success',
  pending_admin: 'warning',
  info_requested: 'warning',
  rejected: 'danger',
  pending: 'muted',
};

const statusLabel = (status, t) => {
  switch (status) {
    case 'approved':
      return t('admin.partners.status.approved');
    case 'pending_admin':
      return t('admin.partners.status.pendingAdmin');
    case 'info_requested':
      return t('admin.partners.status.infoRequested');
    case 'rejected':
      return t('admin.partners.status.rejected');
    default:
      return t('admin.partners.status.pending');
  }
};

const AdminPartners = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const { t } = useTranslation();
  const role = getUserRole();
  const [form, setForm] = useState(() => ({ ...emptyPartnerForm(), address: '', representativeTitle: '', partnerCode: '', description: '' }));
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAdminRole(role)) {
      showToast?.(t('admin.common.noAccess'), 'error');
      navigate('/profile');
    }
  }, [role, navigate, showToast, t]);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminPartners('all');
      setPartners(Array.isArray(res.partners) ? res.partners : []);
    } catch (err) {
      showToast?.(err.message || t('admin.partners.toast.loadFail'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminRole(role)) loadPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm({ ...emptyPartnerForm(), address: '', representativeTitle: '', partnerCode: '', description: '' });
    setEditingId('');
  };

  const filteredPartners = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return partners;
    return partners.filter((partner) =>
      [partner.name, partner.email, partner.phone, partner.representative, partner.category, partner.partnerCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [partners, search]);

  const handleCancel = () => {
    resetForm();
    showToast?.(t('admin.partners.toast.cancelled'), 'info');
  };

  const handleEdit = (partner) => {
    setEditingId(partner._id);
    setForm(toForm(partner));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (partner) => {
    const confirmed = window.confirm(
      t('admin.partners.deleteConfirm', { name: partner.name || t('admin.partners.defaultPartnerName') }),
    );
    if (!confirmed) return;
    setDeletingId(partner._id);
    try {
      await deleteAdminPartner(partner._id);
      setPartners((prev) => prev.filter((item) => item._id !== partner._id));
      if (editingId === partner._id) resetForm();
      showToast?.(t('admin.partners.toast.deleted'), 'success');
    } catch (err) {
      showToast?.(err.message || t('admin.partners.toast.deleteFail'), 'error');
    } finally {
      setDeletingId('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.companyName.trim() || !form.field || !form.representative.trim() || !form.email.trim() || !form.phone.trim()) {
      showToast?.(t('admin.partners.required'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload(form);
      if (editingId) {
        const res = await updateAdminPartner(editingId, payload);
        setPartners((prev) => prev.map((item) => (item._id === editingId ? res.partner : item)));
        showToast?.(t('admin.partners.toast.updated'), 'success');
      } else {
        const res = await createAdminPartner(payload);
        setPartners((prev) => [res.partner, ...prev]);
        if (res.accountCreated) {
          showToast?.(t('admin.partners.toast.addedWithAccount'), 'success');
        } else {
          showToast?.(t('admin.partners.toast.added'), 'success');
        }
      }
      resetForm();
    } catch (err) {
      showToast?.(err.message || t('admin.partners.toast.saveFail'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdminRole(role)) return null;

  return (
    <main className="admin-main">
      <div className="admin-partners-page">
        <div className="admin-partners-card">
          <header className="admin-partners-card__header">
            <div>
              <h1 className="admin-partners-card__title">{t('admin.partners.title')}</h1>
              <p className="admin-partners-card__subtitle">{t('admin.partners.subtitle')}</p>
            </div>
            <div className="admin-partners-card__summary">
              <strong>{partners.length}</strong>
              <span>{t('admin.partners.summary')}</span>
            </div>
          </header>

          <form className="admin-partners-form" onSubmit={handleSubmit} noValidate>
            <div className="admin-partners-form__toolbar">
              <div>
                <h2>{editingId ? t('admin.partners.form.editTitle') : t('admin.partners.form.createTitle')}</h2>
                <p>{editingId ? t('admin.partners.form.editSubtitle') : t('admin.partners.form.createSubtitle')}</p>
              </div>
              {editingId ? (
                <span className="admin-partners-chip">{t('admin.partners.form.editing')}</span>
              ) : null}
            </div>

            <div className="admin-partners-form__grid">
              <div className="admin-data-field">
                <label className="admin-partner-field__label" htmlFor="partner-company">
                  {t('admin.partners.companyName')} <span className="admin-partner-required">*</span>
                </label>
                <input
                  id="partner-company"
                  type="text"
                  className="admin-data-input"
                  value={form.companyName}
                  onChange={(e) => setField('companyName', e.target.value)}
                  placeholder={t('admin.partners.companyPlaceholder')}
                  required
                  disabled={submitting}
                />
              </div>

              <AdminDataSelect
                label={`${t('admin.partners.field')} *`}
                labelClassName="admin-partner-field__label"
                value={form.field}
                options={PARTNER_FIELD_OPTIONS}
                placeholder={t('admin.partners.fieldPlaceholder')}
                onChange={(v) => setField('field', v)}
                disabled={submitting}
                required
              />
            </div>

            <div className="admin-partners-form__grid">
              <div className="admin-data-field">
                <label className="admin-partner-field__label" htmlFor="partner-rep">
                  {t('admin.partners.representative')} <span className="admin-partner-required">*</span>
                </label>
                <input
                  id="partner-rep"
                  type="text"
                  className="admin-data-input"
                  value={form.representative}
                  onChange={(e) => setField('representative', e.target.value)}
                  placeholder={t('admin.partners.representativePlaceholder')}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="admin-data-field">
                <label className="admin-partner-field__label" htmlFor="partner-rep-title">
                  {t('admin.partners.representativeTitle')}
                </label>
                <input
                  id="partner-rep-title"
                  type="text"
                  className="admin-data-input"
                  value={form.representativeTitle}
                  onChange={(e) => setField('representativeTitle', e.target.value)}
                  placeholder={t('admin.partners.representativeTitlePlaceholder')}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="admin-partners-form__grid">
              <div className="admin-data-field">
                <label className="admin-partner-field__label" htmlFor="partner-email">
                  {t('admin.partners.email')} <span className="admin-partner-required">*</span>
                </label>
                <input
                  id="partner-email"
                  type="email"
                  className="admin-data-input"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="email@company.com"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="admin-data-field">
                <label className="admin-partner-field__label" htmlFor="partner-phone">
                  {t('admin.partners.phone')} <span className="admin-partner-required">*</span>
                </label>
                <input
                  id="partner-phone"
                  type="tel"
                  className="admin-data-input"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  placeholder="09xx xxx xxx"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="admin-partners-form__grid">
              <div className="admin-data-field">
                <label className="admin-partner-field__label" htmlFor="partner-code">
                  {t('admin.partners.partnerCode')}
                </label>
                <input
                  id="partner-code"
                  type="text"
                  className="admin-data-input"
                  value={form.partnerCode}
                  onChange={(e) => setField('partnerCode', e.target.value)}
                  placeholder={t('admin.partners.partnerCodePlaceholder')}
                  disabled={submitting}
                />
              </div>

              <div className="admin-data-field">
                <label className="admin-partner-field__label" htmlFor="partner-address">
                  {t('admin.partners.address')}
                </label>
                <input
                  id="partner-address"
                  type="text"
                  className="admin-data-input"
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  placeholder={t('admin.partners.addressPlaceholder')}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="admin-data-field">
              <label className="admin-partner-field__label" htmlFor="partner-description">
                {t('admin.partners.description')}
              </label>
              <textarea
                id="partner-description"
                className="admin-data-input admin-partners-textarea"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder={t('admin.partners.descriptionPlaceholder')}
                disabled={submitting}
                rows={4}
              />
            </div>

            <footer className="admin-partners-form__footer">
              <button type="button" className="admin-partners-btn-cancel" onClick={handleCancel} disabled={submitting}>
                {editingId ? t('admin.partners.clearEdit') : t('admin.common.cancel')}
              </button>
              <button type="submit" className="admin-partners-btn-submit" disabled={submitting}>
                {submitting
                  ? editingId
                    ? t('admin.partners.updating')
                    : t('admin.partners.submitting')
                  : editingId
                    ? t('admin.partners.update')
                    : t('admin.partners.submit')}
              </button>
            </footer>
          </form>
        </div>

        <section className="admin-partners-list-card">
          <div className="admin-partners-list-card__header">
            <div>
              <h2>{t('admin.partners.listTitle')}</h2>
              <p>{t('admin.partners.listSubtitle')}</p>
            </div>
            <label className="admin-partners-search">
              <span className="sr-only">{t('admin.partners.search')}</span>
              <input
                type="search"
                className="admin-data-input"
                placeholder={t('admin.partners.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          {loading ? (
            <div className="admin-partners-empty">{t('admin.common.loading')}</div>
          ) : filteredPartners.length ? (
            <div className="admin-partners-list">
              {filteredPartners.map((partner) => (
                <article key={partner._id} className="admin-partner-item">
                  <div className="admin-partner-item__main">
                    <div className="admin-partner-item__head">
                      <h3>{partner.name || t('admin.partners.defaultPartnerName')}</h3>
                      <span className={`admin-partner-status admin-partner-status--${statusToneMap[partner.status] || 'muted'}`}>
                        {statusLabel(partner.status, t)}
                      </span>
                    </div>
                    <div className="admin-partner-item__meta">
                      <span>{partner.category || '—'}</span>
                      <span>{partner.representative || '—'}</span>
                      <span>{partner.phone || '—'}</span>
                      <span>{partner.email || '—'}</span>
                    </div>
                    {partner.description ? <p className="admin-partner-item__desc">{partner.description}</p> : null}
                  </div>
                  <div className="admin-partner-item__actions">
                    <button type="button" className="admin-partners-btn-ghost" onClick={() => handleEdit(partner)}>
                      {t('admin.common.edit')}
                    </button>
                    <button
                      type="button"
                      className="admin-partners-btn-danger"
                      onClick={() => handleDelete(partner)}
                      disabled={deletingId === partner._id}
                    >
                      {deletingId === partner._id ? t('admin.partners.deleting') : t('admin.common.delete')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-partners-empty">{t('admin.partners.empty')}</div>
          )}
        </section>
      </div>
    </main>
  );
};

export default AdminPartners;
