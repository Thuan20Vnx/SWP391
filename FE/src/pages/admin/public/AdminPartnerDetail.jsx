import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminFptCollapsible from '../../../components/admin/AdminFptCollapsible';
import PublicAdminShell from '../../../layouts/PublicAdminShell';
import SiteFooter from '../../../components/SiteFooter';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import PartnerAvatar from '../../../components/partner/PartnerAvatar';
import ProposalTicketsTable from '../../../components/admin/ProposalTicketsTable';
import {
  addAdminPartnerMember,
  approveAdminPartner,
  fetchAdminPartner,
  rejectAdminPartner,
  removeAdminPartnerMember,
  requestAdminPartnerTermination,
} from '../../../services/adminApi';
import {
  PARTNER_STATUS_TONE,
  formatPartnerDate,
  formatPartnerDateTimeRange,
  formatVnd,
  getPartnerStatusDetailLabel,
  resolvePartnerAttachmentUrl,
} from '../../../utils/partnerDisplay';
import { openProtectedMedia } from '../../../utils/mediaFile';
import { useTranslation } from '../../../i18n/I18nContext';
import '../../../styles/admin-dashboard.css';

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const resolvePartnerId = (raw) => String(raw || '').replace(/^partner-/, '').trim();

const EMPTY_MEMBER_FORM = {
  fullname: '',
  email: '',
  phone: '',
  title: '',
  activateNow: true,
};

const AdminPartnerDetail = ({ showToast }) => {
  const { t } = useTranslation();
  const { partnerId: routePartnerId } = useParams();
  const partnerId = resolvePartnerId(routePartnerId);
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [members, setMembers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [eventRequest, setEventRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [terminationOpen, setTerminationOpen] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [terminationConfirm, setTerminationConfirm] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER_FORM);
  const [removeMemberTarget, setRemoveMemberTarget] = useState(null);

  const load = useCallback(async () => {
    if (!partnerId) {
      setLoadError(t('admin.partnerDetail.invalidId'));
      return;
    }
    try {
      const d = await fetchAdminPartner(partnerId);
      setPartner(d.partner);
      setMembers(d.members || []);
      setContracts(d.contracts || []);
      setEventRequest(d.eventRequest || null);
      setLoadError('');
    } catch (e) {
      setLoadError(e.message || t('admin.partnerDetail.loadError'));
      setPartner(null);
      setMembers([]);
    }
  }, [partnerId, t]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleApprove = async () => {
    setBusy(true);
    try {
      const res = await approveAdminPartner(partnerId);
      if (res.accountCreated) {
        showToast?.(t('admin.partnerApprovals.toast.approvedWithAccount'), 'success');
      } else {
        showToast?.(t('admin.partnerApprovals.toast.approved'), 'success');
      }
      setConfirmApprove(false);
      await load();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setBusy(true);
    try {
      await rejectAdminPartner(partnerId, rejectReason.trim());
      showToast?.(t('admin.partnerDetail.toast.rejected'), 'info');
      setRejectOpen(false);
      setRejectReason('');
      await load();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleTermination = async () => {
    if (!terminationReason.trim()) {
      showToast?.(t('admin.partnerDetail.toast.terminationReasonRequired'), 'error');
      return;
    }
    setBusy(true);
    try {
      await requestAdminPartnerTermination(partnerId, terminationReason.trim());
      showToast?.(t('admin.partnerDetail.toast.terminationSent'), 'success');
      setTerminationConfirm(false);
      setTerminationOpen(false);
      setTerminationReason('');
      await load();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async () => {
    const { fullname, email, phone, title, activateNow } = memberForm;
    if (!fullname.trim() || !email.trim()) {
      showToast?.(t('admin.partnerDetail.toast.memberRequired'), 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await addAdminPartnerMember(partnerId, {
        fullname: fullname.trim(),
        email: email.trim(),
        phone: phone.trim(),
        title: title.trim(),
        activateNow,
      });
      const pwdNote = res.defaultPassword
        ? t('admin.partnerDetail.toast.defaultPassword', { password: res.defaultPassword })
        : '';
      showToast?.(`${res.message || t('admin.partnerDetail.toast.memberAdded')}${pwdNote}`, 'success');
      setAddMemberOpen(false);
      setMemberForm(EMPTY_MEMBER_FORM);
      await load();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberTarget) return;
    setBusy(true);
    try {
      await removeAdminPartnerMember(partnerId, removeMemberTarget.id);
      showToast?.(t('admin.partnerDetail.toast.memberDeactivated'), 'info');
      setRemoveMemberTarget(null);
      await load();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const pageContent = () => {
    if (loading) {
      return (
        <div className="admin-partner-detail">
          <p className="admin-partner-detail__muted">{t('admin.common.loading')}</p>
        </div>
      );
    }

    if (loadError || !partner) {
      return (
        <div className="admin-partner-detail">
          <Link to="/" className="admin-partner-detail__back">
            {t('admin.fpt.dept.back')}
          </Link>
          <p className="admin-partner-detail__muted">{loadError || t('admin.partnerDetail.notFound')}</p>
          <button
            type="button"
            className="admin-partner-detail__btn admin-partner-detail__btn--primary"
            onClick={() => load()}
          >
            {t('common.retry')}
          </button>
        </div>
      );
    }

    const tone = PARTNER_STATUS_TONE[partner.status] || 'slate';
    const statusLabel = getPartnerStatusDetailLabel(partner.status, t);
    const empty = t('admin.common.empty');
    const mainContract = contracts[0];
    const eventTitle =
      eventRequest?.title || partner.proposedEventTitle || mainContract?.title || empty;
    const amount =
      eventRequest?.expectedSponsorAmount ?? partner.expectedSponsorAmount ?? mainContract?.amount;
    const canAdminAct = partner.status === 'pending_admin';
    const canManageMembers = partner.status !== 'rejected';
    const canTerminate =
      ['approved', 'pending_admin'].includes(partner.status) &&
      partner.terminationStatus !== 'pending';
    const activeMembers = members.filter((m) => m.isActive);
    const inactiveMembers = members.filter((m) => !m.isActive);
    const primaryMember =
      activeMembers.find((m) => m.isPrimary) ||
      members.find((m) => m.isPrimary) ||
      null;
    const otherActiveMembers = activeMembers.filter((m) => !m.isPrimary);
    const registrantName =
      primaryMember?.fullname || partner.representative || empty;
    const registrantTitle =
      primaryMember?.title || partner.representativeTitle || empty;
    const registrantEmail = primaryMember?.email || partner.email || empty;
    const registrantPhone = primaryMember?.phone || partner.phone || empty;
    const eventBenefits = eventRequest?.benefits?.length ? eventRequest.benefits : partner.benefits;
    const attachmentItems = (eventRequest?.attachments || [])
      .map((f, i) => ({
        key: `req-att-${i}`,
        ...f,
        href: resolvePartnerAttachmentUrl(f),
      }))
      // Chỉ hiện đính kèm có file thật / link hợp lệ (tránh thẻ rỗng).
      .filter((f) => f.hasFile || f.href);
    const attachmentLinks = (eventRequest?.attachmentLinks || []).filter(Boolean);

    const openAttachment = async (file) => {
      const href = file.href || file.url || '';
      if (!href || href === '#') return;
      try {
        await openProtectedMedia(file.attachmentUrl || file.url || href, file.name || 'attachment');
      } catch (e) {
        showToast?.(e.message || 'Không mở được tệp.', 'error');
      }
    };

    return (
      <div className="admin-partner-detail">
        <Link to="/" className="admin-partner-detail__back">
          {t('admin.fpt.dept.back')}
        </Link>

        <header className="admin-partner-detail__header admin-partner-detail__header--company">
          <PartnerAvatar partner={partner} className="admin-partner-detail__avatar admin-partner-detail__avatar--lg" />
          <div className="admin-partner-detail__header-body">
            <div className="admin-partner-detail__title-row">
              <h1>{partner.name}</h1>
              <span className={`admin-partner-detail__status admin-partner-detail__status--${tone}`}>
                {statusLabel}
              </span>
            </div>
            {partner.category && (
              <p className="admin-partner-detail__meta">
                {t('admin.partnerDetail.fieldCategory', { category: partner.category })}
              </p>
            )}
            <p className="admin-partner-detail__meta">
              {t('admin.partnerDetail.submittedDate', { date: formatPartnerDate(partner.createdAt) })}
              {partner.partnerCode
                ? t('admin.partnerDetail.partnerCodeSuffix', { code: partner.partnerCode })
                : ''}
            </p>
          </div>
        </header>

        {canAdminAct && (
          <div className="admin-partner-detail__banner">
            {t('admin.partnerDetail.banner.ctsvApproved', {
              email: partner.ctsvApprovedByEmail
                ? t('admin.partnerDetail.banner.ctsvEmail', { email: partner.ctsvApprovedByEmail })
                : '',
            })}
          </div>
        )}

        {canAdminAct && (
          <div className="admin-partner-detail__actions admin-partner-detail__actions--top">
            <button
              type="button"
              className="admin-partner-detail__btn admin-partner-detail__btn--ghost"
              disabled={busy}
              onClick={() => setRejectOpen(true)}
            >
              {t('admin.common.reject')}
            </button>
            <button
              type="button"
              className="admin-partner-detail__btn admin-partner-detail__btn--primary"
              disabled={busy}
              onClick={() => setConfirmApprove(true)}
            >
              {t('admin.partnerDetail.approvePartner')}
            </button>
          </div>
        )}

        {partner.terminationStatus === 'pending' && (
          <div className="admin-partner-detail__banner admin-partner-detail__banner--warn">
            {t('admin.partnerDetail.banner.terminationSent', {
              date: partner.terminationRequestedAt
                ? t('admin.partnerDetail.banner.terminationDate', {
                    date: formatPartnerDate(partner.terminationRequestedAt),
                  })
                : '',
              reason: partner.terminationReason
                ? t('admin.partnerDetail.banner.terminationReasonSep', {
                    reason: partner.terminationReason,
                  })
                : '',
            })}
          </div>
        )}

        <div className="admin-partner-detail__sections">
          <section className="admin-partner-detail__panel admin-partner-detail__panel--company">
            <h2>{t('admin.partnerDetail.section.companyInfo')}</h2>
            <dl className="admin-partner-detail__dl">
              <div>
                <dt>{t('admin.partnerDetail.label.companyName')}</dt>
                <dd>{partner.name}</dd>
              </div>
              <div>
                <dt>{t('admin.partnerDetail.label.partnerCode')}</dt>
                <dd>{partner.partnerCode || empty}</dd>
              </div>
              <div>
                <dt>{t('admin.partnerDetail.label.field')}</dt>
                <dd>{partner.category || empty}</dd>
              </div>
              <div>
                <dt>{t('admin.partnerDetail.label.address')}</dt>
                <dd>{partner.address || empty}</dd>
              </div>
              <div>
                <dt>{t('admin.partnerDetail.label.companyPhone')}</dt>
                <dd>{partner.phone || empty}</dd>
              </div>
              <div>
                <dt>{t('admin.partnerDetail.label.companyDesc')}</dt>
                <dd>{partner.description || empty}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-partner-detail__panel admin-partner-detail__panel--registrant">
            <h2>{t('admin.partnerDetail.section.registrantInfo')}</h2>
            <div className="admin-partner-detail__registrant-row">
              <PartnerAvatar
                partner={{
                  name: registrantName,
                  logo: primaryMember?.avatar,
                  avatar: primaryMember?.avatar,
                }}
                className="admin-partner-detail__avatar admin-partner-detail__avatar--member"
              />
              <dl className="admin-partner-detail__dl admin-partner-detail__dl--inline">
                <div>
                  <dt>{t('admin.partnerDetail.label.fullName')}</dt>
                  <dd>{registrantName}</dd>
                </div>
                <div>
                  <dt>{t('admin.partnerDetail.label.title')}</dt>
                  <dd>{registrantTitle}</dd>
                </div>
                <div>
                  <dt>{t('admin.partnerDetail.label.email')}</dt>
                  <dd>{registrantEmail}</dd>
                </div>
                <div>
                  <dt>{t('admin.partnerDetail.label.phone')}</dt>
                  <dd>{registrantPhone}</dd>
                </div>
                {primaryMember?.hasAccount && (
                  <div>
                    <dt>{t('admin.partnerDetail.label.accountStatus')}</dt>
                    <dd>
                      <span
                        className={`admin-partner-detail__badge ${
                          primaryMember.accountActive
                            ? 'admin-partner-detail__badge--active'
                            : 'admin-partner-detail__badge--inactive'
                        }`}
                      >
                        {primaryMember.accountActive
                          ? t('admin.partnerDetail.accountStatus.active')
                          : t('admin.partnerDetail.accountStatus.inactive')}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </section>

          <section className="admin-partner-detail__panel admin-partner-detail__panel--members">
            <div className="admin-partner-detail__panel-head">
              <div>
                <h2>{t('admin.partnerDetail.section.extraManagers')}</h2>
                <p className="admin-partner-detail__panel-desc">
                  {t('admin.partnerDetail.extraManagers.desc')}
                </p>
              </div>
              {canManageMembers && (
                <button
                  type="button"
                  className="admin-partner-detail__btn admin-partner-detail__btn--primary admin-partner-detail__btn--sm"
                  disabled={busy}
                  onClick={() => setAddMemberOpen(true)}
                >
                  {t('admin.partnerDetail.addAccount')}
                </button>
              )}
            </div>

            {otherActiveMembers.length === 0 ? (
              <p className="admin-partner-detail__muted-inline">
                {t('admin.partnerDetail.noExtraManagers')}
              </p>
            ) : (
              <ul className="admin-partner-detail__member-list">
                {otherActiveMembers.map((m) => (
                  <li key={m.id} className="admin-partner-detail__member-card">
                    <PartnerAvatar
                      partner={{ name: m.fullname, logo: m.avatar, avatar: m.avatar }}
                      className="admin-partner-detail__avatar admin-partner-detail__avatar--member"
                    />
                    <div className="admin-partner-detail__member-info">
                      <div className="admin-partner-detail__member-name-row">
                        <strong>{m.fullname || m.email}</strong>
                        {m.hasAccount && (
                          <span
                            className={`admin-partner-detail__badge ${
                              m.accountActive
                                ? 'admin-partner-detail__badge--active'
                                : 'admin-partner-detail__badge--inactive'
                            }`}
                          >
                            {m.accountActive
                              ? t('admin.partnerDetail.accountStatus.active')
                              : t('admin.partnerDetail.accountStatus.inactive')}
                          </span>
                        )}
                      </div>
                      {m.title && <span className="admin-partner-detail__member-meta">{m.title}</span>}
                      <span className="admin-partner-detail__member-meta">
                        {[m.email, m.phone].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    {canManageMembers && (
                      <button
                        type="button"
                        className="admin-partner-detail__btn admin-partner-detail__btn--ghost admin-partner-detail__btn--sm"
                        disabled={busy}
                        onClick={() => setRemoveMemberTarget(m)}
                      >
                        {t('admin.partnerDetail.revokeAccess')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {inactiveMembers.length > 0 && (
              <div className="admin-partner-detail__member-inactive">
                <h3>{t('admin.partnerDetail.deactivated')}</h3>
                <ul className="admin-partner-detail__member-list admin-partner-detail__member-list--inactive">
                  {inactiveMembers.map((m) => (
                    <li key={m.id} className="admin-partner-detail__member-card">
                      <span>{m.fullname || m.email}</span>
                      <span className="admin-partner-detail__member-meta">{m.email}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="admin-partner-detail__panel">
            <h2>{t('admin.partnerDetail.section.proposalContract')}</h2>
            <ul className="admin-proposal-list">
              <li className="admin-proposal-card">
                <div className="admin-proposal-card__head">
                  <div className="admin-proposal-card__head-main">
                    <h2 className="admin-proposal-card__title">{eventTitle}</h2>
                  </div>
                  <span className="admin-proposal-card__badge">{formatVnd(amount)}</span>
                </div>

                <div className="admin-proposal-card__body">
                  <div className="admin-proposal-card__thumb-wrap">
                    {eventRequest?.image ? (
                      <img src={eventRequest.image} alt="" className="admin-proposal-card__thumb" />
                    ) : (
                      <PartnerAvatar partner={partner} className="admin-proposal-card__thumb" />
                    )}
                  </div>

                  <div className="admin-proposal-card__details">
                    <dl className="admin-proposal-meta">
                      <div className="admin-proposal-meta__row">
                        <dt>{t('admin.partnerDetail.label.locationFormat')}</dt>
                        <dd>
                          {eventRequest?.location || empty}
                          {eventRequest?.format ? ` · ${eventRequest.format}` : ''}
                        </dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>{t('admin.partnerDetail.label.contract')}</dt>
                        <dd>
                          {contracts.length
                            ? contracts
                                .map((c) => c.title || t('admin.partnerDetail.contract.sponsorDefault'))
                                .join(', ')
                            : empty}
                        </dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Thời gian diễn ra</dt>
                        <dd>{formatPartnerDateTimeRange(eventRequest?.startDate, eventRequest?.endDate)}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Thời gian đăng ký</dt>
                        <dd>{formatPartnerDateTimeRange(eventRequest?.registrationStartDate, eventRequest?.registrationEndDate)}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Loại sự kiện</dt>
                        <dd>{eventRequest?.eventType || empty}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Tổng vé</dt>
                        <dd>{eventRequest?.totalTickets != null ? eventRequest.totalTickets : empty}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Số người dự kiến</dt>
                        <dd>{eventRequest?.expectedAttendees ? eventRequest.expectedAttendees : empty}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Thời lượng</dt>
                        <dd>{eventRequest?.duration || empty}</dd>
                      </div>
                      <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                        <dt>Tin nhắn gửi CTSV</dt>
                        <dd>{eventRequest?.partnerMessage || empty}</dd>
                      </div>
                      <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                        <dt>Quyền lợi đối tác yêu cầu</dt>
                        <dd>
                          {eventBenefits?.length ? (
                            <ul className="ctsv-pd-benefits">
                              {eventBenefits.map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          ) : (
                            empty
                          )}
                        </dd>
                      </div>
                      {(eventRequest?.learningOutcomes || []).filter(Boolean).length > 0 && (
                        <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                          <dt>Nội dung / kết quả đạt được</dt>
                          <dd>
                            <ul className="ctsv-pd-benefits">
                              {(eventRequest.learningOutcomes || []).filter(Boolean).map((o, i) => (
                                <li key={i}>{o}</li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                      )}
                      {eventRequest?.agenda && (
                        <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                          <dt>Lịch trình / chương trình</dt>
                          <dd style={{ whiteSpace: 'pre-wrap' }}>{eventRequest.agenda}</dd>
                        </div>
                      )}
                      {(eventRequest?.speakers || []).filter((s) => s?.name).length > 0 && (
                        <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                          <dt>Diễn giả</dt>
                          <dd>
                            <ul className="ctsv-pd-benefits">
                              {(eventRequest.speakers || []).filter((s) => s?.name).map((s, i) => (
                                <li key={i}>{s.name}{s.role ? ` — ${s.role}` : ''}</li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                      )}
                    </dl>

                    <ProposalTicketsTable ticketTypes={eventRequest?.ticketTypes} ticketPrice={0} />
                  </div>
                </div>

                {(eventRequest?.description || partner.description) && (
                  <div className="admin-proposal-card__full">
                    <div className="admin-proposal-card__desc">
                      <p className="admin-proposal-card__desc-label">{t('admin.partnerDetail.label.eventDesc')}</p>
                      <p className="admin-proposal-card__desc-text">
                        {eventRequest?.description || partner.description}
                      </p>
                    </div>
                  </div>
                )}

                <div className="admin-proposal-card__full">
                  <p className="admin-proposal-card__desc-label" style={{ marginBottom: 8 }}>
                    Tệp đính kèm
                  </p>
                  {attachmentItems.length || attachmentLinks.length ? (
                    <ul className="ctsv-pd-files">
                      {attachmentItems.map((f) => (
                        <li key={f.key}>
                          <button
                            type="button"
                            className="ctsv-pd-file"
                            onClick={() => openAttachment(f)}
                          >
                            <span className="ctsv-pd-file-icon">
                              <FileIcon />
                            </span>
                            <span className="ctsv-pd-file-body">
                              <span className="ctsv-pd-file-name">{f.name}</span>
                              <span className="ctsv-pd-file-size">{f.sizeLabel || '—'}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                      {attachmentLinks.map((link, i) => (
                        <li key={`req-link-${i}`}>
                          <a href={link} className="ctsv-pd-file" target="_blank" rel="noreferrer">
                            <span className="ctsv-pd-file-icon">
                              <FileIcon />
                            </span>
                            <span className="ctsv-pd-file-body">
                              <span className="ctsv-pd-file-name">{link}</span>
                              <span className="ctsv-pd-file-size">Liên kết</span>
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="admin-partner-detail__muted-inline">{empty}</p>
                  )}
                </div>

                <div className="admin-proposal-card__full">
                  <button
                    type="button"
                    className="admin-partner-detail__inline-link"
                    onClick={() =>
                      navigate(
                        `/admin/unit-notify/partner/${partnerId}?name=${encodeURIComponent(partner.name)}`,
                      )
                    }
                  >
                    {t('admin.partnerDetail.notifyLink')}
                  </button>
                </div>
              </li>
            </ul>
          </section>
        </div>

        {canTerminate && (
          <AdminFptCollapsible
            title={t('admin.partnerDetail.termination.title')}
            subtitle={t('admin.partnerDetail.termination.subtitle')}
            tone="danger"
            open={terminationOpen}
            onToggle={() => setTerminationOpen((v) => !v)}
            panelId="partner-termination-panel"
          >
            <p className="admin-partner-detail__hint">
              {t('admin.partnerDetail.termination.hintPrefix')}{' '}
              <strong>{partner.name}</strong>{' '}
              {t('admin.partnerDetail.termination.hintSuffix')}
            </p>
            <label className="admin-partner-detail__field">
              <span>{t('admin.partnerDetail.termination.reasonLabel')}</span>
              <textarea
                rows={4}
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                placeholder={t('admin.partnerDetail.termination.reasonPlaceholder')}
                disabled={busy}
              />
            </label>
            <button
              type="button"
              className="admin-partner-detail__btn admin-partner-detail__btn--danger"
              disabled={busy || !terminationReason.trim()}
              onClick={() => setTerminationConfirm(true)}
            >
              {t('admin.partnerDetail.termination.submit')}
            </button>
          </AdminFptCollapsible>
        )}

        {canAdminAct && (
          <div className="admin-partner-detail__actions">
            <button
              type="button"
              className="admin-partner-detail__btn admin-partner-detail__btn--ghost"
              disabled={busy}
              onClick={() => setRejectOpen(true)}
            >
              {t('admin.common.reject')}
            </button>
            <button
              type="button"
              className="admin-partner-detail__btn admin-partner-detail__btn--primary"
              disabled={busy}
              onClick={() => setConfirmApprove(true)}
            >
              {t('admin.partnerDetail.approvePartner')}
            </button>
          </div>
        )}

        <ConfirmDialog
          open={confirmApprove}
          title={t('admin.partnerDetail.confirm.approve.title')}
          message={t('admin.partnerDetail.confirm.approve.message')}
          confirmLabel={t('admin.common.approve')}
          cancelLabel={t('admin.common.cancel')}
          loading={busy}
          onCancel={() => !busy && setConfirmApprove(false)}
          onConfirm={handleApprove}
        />

        <ConfirmDialog
          open={terminationConfirm}
          title={t('admin.partnerDetail.confirm.termination.title')}
          message={t('admin.partnerDetail.confirm.termination.message', { name: partner.name })}
          confirmLabel={t('admin.partnerDetail.confirmSend')}
          cancelLabel={t('announce.dialog.back')}
          loading={busy}
          onCancel={() => !busy && setTerminationConfirm(false)}
          onConfirm={handleTermination}
        />

        <ConfirmDialog
          open={Boolean(removeMemberTarget)}
          title={t('admin.partnerDetail.confirm.revoke.title')}
          message={t('admin.partnerDetail.confirm.revoke.message', {
            name: removeMemberTarget?.fullname || removeMemberTarget?.email,
            company: partner.name,
          })}
          confirmLabel={t('admin.partnerDetail.revokeAccess')}
          cancelLabel={t('admin.common.cancel')}
          loading={busy}
          onCancel={() => !busy && setRemoveMemberTarget(null)}
          onConfirm={handleRemoveMember}
        />

        {rejectOpen && (
          <div className="admin-partner-detail__modal" role="dialog" aria-modal="true">
            <div className="admin-partner-detail__modal-card">
              <h3>{t('admin.partnerDetail.reject.title')}</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('admin.partnerDetail.reject.placeholder')}
                rows={4}
              />
              <div className="admin-partner-detail__modal-actions">
                <button type="button" disabled={busy} onClick={() => setRejectOpen(false)}>
                  {t('admin.common.cancel')}
                </button>
                <button
                  type="button"
                  className="admin-partner-detail__btn admin-partner-detail__btn--danger"
                  disabled={busy || !rejectReason.trim()}
                  onClick={handleReject}
                >
                  {t('admin.partnerDetail.reject.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}

        {addMemberOpen && (
          <div className="admin-partner-detail__modal" role="dialog" aria-modal="true">
            <div className="admin-partner-detail__modal-card admin-partner-detail__modal-card--wide">
              <h3>{t('admin.partnerDetail.addMember.title')}</h3>
              <p className="admin-partner-detail__hint">
                {t('admin.partnerDetail.addMember.hintPrefix')}{' '}
                <strong>{partner.name}</strong>{' '}
                {t('admin.partnerDetail.addMember.hintSuffix')}
              </p>
              <label className="admin-partner-detail__field">
                <span>{t('admin.partnerDetail.label.fullName')}</span>
                <input
                  type="text"
                  value={memberForm.fullname}
                  onChange={(e) => setMemberForm((f) => ({ ...f, fullname: e.target.value }))}
                  placeholder={t('admin.partnerDetail.placeholder.fullName')}
                  disabled={busy}
                />
              </label>
              <label className="admin-partner-detail__field">
                <span>{t('admin.partnerDetail.addMember.loginEmail')}</span>
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="manager@company.com"
                  disabled={busy}
                />
              </label>
              <label className="admin-partner-detail__field">
                <span>{t('admin.partnerDetail.label.title')}</span>
                <input
                  type="text"
                  value={memberForm.title}
                  onChange={(e) => setMemberForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={t('admin.partnerDetail.placeholder.title')}
                  disabled={busy}
                />
              </label>
              <label className="admin-partner-detail__field">
                <span>{t('admin.partnerDetail.label.phone')}</span>
                <input
                  type="tel"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm((f) => ({ ...f, phone: e.target.value }))}
                  disabled={busy}
                />
              </label>
              <label className="admin-partner-detail__checkbox">
                <input
                  type="checkbox"
                  checked={memberForm.activateNow}
                  onChange={(e) =>
                    setMemberForm((f) => ({ ...f, activateNow: e.target.checked }))
                  }
                  disabled={busy}
                />
                <span>{t('admin.partnerDetail.addMember.activateNow')}</span>
              </label>
              <div className="admin-partner-detail__modal-actions">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAddMemberOpen(false);
                    setMemberForm(EMPTY_MEMBER_FORM);
                  }}
                >
                  {t('admin.common.cancel')}
                </button>
                <button
                  type="button"
                  className="admin-partner-detail__btn admin-partner-detail__btn--primary"
                  disabled={busy}
                  onClick={handleAddMember}
                >
                  {t('admin.partnerDetail.addMember.create')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <PublicAdminShell activeNav="home">
      <div className="admin-fpt-system home-layout">
        <main className="admin-fpt-system__main">{pageContent()}</main>
        <SiteFooter />
      </div>
    </PublicAdminShell>
  );
};

export default AdminPartnerDetail;
