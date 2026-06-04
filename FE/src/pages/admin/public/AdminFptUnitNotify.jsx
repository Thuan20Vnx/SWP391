import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';

import AdminFptCollapsible from '../../../components/admin/AdminFptCollapsible';

import TargetAudiencePicker from '../../../components/announcements/TargetAudiencePicker';

import { ANNOUNCEMENT_TARGET_ALL } from '../../../constants/announcementTargets';

import { getNoticeCategoryLabel } from '../../../constants/announcementNoticeCategories';

import { fetchAdminPartner, sendAdminPartnerNotice } from '../../../services/adminApi';

import { createManagedAnnouncement, fetchManagedAnnouncements } from '../../../services/announcementManageApi';

import '../../../styles/admin-public-pages.css';



const formatAnnDate = (value) => {

  if (!value) return '—';

  try {

    return new Date(value).toLocaleString('vi-VN');

  } catch {

    return '—';

  }

};



const filterPartnerAnnouncements = (list, partner) => {

  if (!partner) return [];

  const email = String(partner.email || '').trim().toLowerCase();

  const pid = String(partner._id || partner.id || '');

  return (list || []).filter((item) => {

    const pubEmail = String(item.publishedByEmail || '').trim().toLowerCase();

    const targetEmail = String(item.targetPartnerEmail || '').trim().toLowerCase();

    const targetId = String(item.targetPartnerId || '');

    if (targetEmail && email && targetEmail === email) return true;

    if (targetId && pid && targetId === pid) return true;

    if (item.publishedByRole === 'partner' && pubEmail && email && pubEmail === email) return true;

    return false;

  });

};



const filterClubAnnouncements = (list, clubName) => {

  const q = String(clubName || '').trim().toLowerCase();

  if (!q) return list || [];

  return (list || []).filter((item) => {

    const hay = [item.title, item.content, item.publishedByEmail].join(' ').toLowerCase();

    return hay.includes(q);

  });

};



const AdminFptUnitNotify = () => {

  const { unitType, unitId } = useParams();

  const [searchParams] = useSearchParams();

  const unitName = searchParams.get('name') || '';

  const navigate = useNavigate();

  const { showToast } = useOutletContext() || {};



  const [partner, setPartner] = useState(null);

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');

  const [content, setContent] = useState('');

  const [multiOpen, setMultiOpen] = useState(false);

  const [extraTargets, setExtraTargets] = useState([ANNOUNCEMENT_TARGET_ALL]);



  const load = useCallback(async () => {

    setLoading(true);

    try {

      const announcements = await fetchManagedAnnouncements();

      if (unitType === 'partner') {

        const rawId = String(unitId || '').replace(/^partner-/, '');

        const res = await fetchAdminPartner(rawId);

        setPartner(res.partner);

        setHistory(filterPartnerAnnouncements(announcements, res.partner));

      } else {

        setPartner(null);

        setHistory(filterClubAnnouncements(announcements, unitName));

      }

    } catch (e) {

      showToast?.(e.message || 'Không tải được dữ liệu thông báo.', 'error');

      setHistory([]);

    } finally {

      setLoading(false);

    }

  }, [unitType, unitId, unitName, showToast]);



  useEffect(() => {

    load();

  }, [load]);



  const pageTitle = useMemo(() => {

    if (unitType === 'partner') return partner?.name || unitName || 'Đối tác';

    return unitName || unitId || 'Câu lạc bộ';

  }, [unitType, partner, unitName, unitId]);



  const handleSend = async (e) => {

    e.preventDefault();

    if (!title.trim() || !content.trim()) {

      showToast?.('Vui lòng nhập tiêu đề và nội dung.', 'error');

      return;

    }



    setSubmitting(true);

    try {

      if (unitType === 'partner' && partner?._id) {

        const targets = multiOpen && extraTargets.length ? extraTargets : ['partner'];

        await sendAdminPartnerNotice(partner._id, {

          title: title.trim(),

          content: content.trim(),

          targetRoles: targets,

          noticeCategory: 'info',

        });

        showToast?.('Đã gửi thông báo tới đối tác (email + hệ thống).', 'success');

      } else {

        await createManagedAnnouncement({

          title: title.trim(),

          content: content.trim(),

          targetRoles: multiOpen && extraTargets.length ? extraTargets : [ANNOUNCEMENT_TARGET_ALL],

          noticeCategory: 'info',

        });

        showToast?.('Đã gửi thông báo.', 'success');

      }

      setTitle('');

      setContent('');

      await load();

    } catch (err) {

      showToast?.(err.message, 'error');

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <main className="admin-main admin-fpt-unit-notify ctsv-announce-page">

      <Link to="/" className="admin-partner-detail__back">

        ← Quay lại Hệ thống FPT

      </Link>



      <header className="admin-fpt-unit-notify__head">

        <div>

          <span className="admin-fpt-unit-notify__eyebrow">

            {unitType === 'partner' ? 'Thông báo đối tác' : 'Thông báo CLB'}

          </span>

          <h1>{pageTitle}</h1>

          <p>

            {unitType === 'partner'

              ? 'Xem thông báo đối tác đã đăng / Admin đã gửi riêng · Soạn tin mới bên dưới'

              : `Lọc thông báo liên quan tới "${pageTitle}"`}

          </p>

        </div>

        {unitType === 'partner' && partner?._id && (

          <button

            type="button"

            className="admin-fpt-unit-notify__detail-btn"

            onClick={() => navigate(`/partners/${partner._id}`)}

          >

            Chi tiết đối tác

          </button>

        )}

      </header>



      <section className="admin-fpt-unit-notify__history">

        <h2>Thông báo đã có ({history.length})</h2>

        {loading ? (

          <p className="admin-partner-detail__muted">Đang tải...</p>

        ) : history.length === 0 ? (

          <p className="admin-partner-detail__muted">Chưa có thông báo nào cho đơn vị này.</p>

        ) : (

          <ul className="admin-fpt-unit-notify__list">

            {history.map((item) => (

              <li key={item.id || item._id}>

                <div className="admin-fpt-unit-notify__item-head">

                  <strong>{item.title}</strong>

                  <span>{getNoticeCategoryLabel(item.noticeCategory)}</span>

                </div>

                <p>{item.content}</p>

                <div className="admin-fpt-unit-notify__item-meta">

                  <span>{item.publishedByRole === 'partner' ? 'Đối tác đăng' : 'Admin gửi'}</span>

                  <span>{formatAnnDate(item.publishedAt)}</span>

                  {item.publishedByEmail && <span>{item.publishedByEmail}</span>}

                </div>

              </li>

            ))}

          </ul>

        )}

      </section>



      <section className="admin-fpt-unit-notify__compose">

        <h2>Gửi thông báo mới</h2>

        <form onSubmit={handleSend}>

          <label className="admin-partner-detail__field">

            <span>Tiêu đề</span>

            <input

              type="text"

              value={title}

              onChange={(e) => setTitle(e.target.value)}

              placeholder={unitType === 'partner' ? `Thông báo gửi ${pageTitle}` : 'Tiêu đề thông báo'}

              disabled={submitting}

            />

          </label>

          <label className="admin-partner-detail__field">

            <span>Nội dung</span>

            <textarea

              rows={5}

              value={content}

              onChange={(e) => setContent(e.target.value)}

              placeholder="Nội dung thông báo..."

              disabled={submitting}

            />

          </label>



          <AdminFptCollapsible

            title="Gửi thêm cho các bên khác (tuỳ chọn)"

            subtitle="Mặc định chỉ gửi riêng đơn vị này"

            open={multiOpen}

            onToggle={() => setMultiOpen((v) => !v)}

            panelId="unit-notify-multi-target"

          >

            <TargetAudiencePicker

              publisherRole="admin"

              value={extraTargets}

              onChange={setExtraTargets}

            />

          </AdminFptCollapsible>



          <button

            type="submit"

            className="admin-partner-detail__btn admin-partner-detail__btn--primary"

            disabled={submitting}

          >

            {submitting ? 'Đang gửi...' : 'Gửi thông báo'}

          </button>

        </form>

      </section>

    </main>

  );

};



export default AdminFptUnitNotify;

