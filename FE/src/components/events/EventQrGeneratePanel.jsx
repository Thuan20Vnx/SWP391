import React, { useCallback, useEffect, useMemo, useState } from 'react';

import QRCode from 'qrcode';

import AppSelect from '../ui/AppSelect';

import { fetchStationQr, generateStationQr } from '../../services/scannerApi';



const DURATION_OPTIONS = [

  { value: '15', label: '15 phút' },

  { value: '30', label: '30 phút' },

  { value: '60', label: '1 giờ' },

  { value: '120', label: '2 giờ' },

  { value: '240', label: '4 giờ' },

  { value: '720', label: '12 giờ' },

  { value: '1440', label: '24 giờ' },

];



const toLocalDatetimeValue = (date = new Date()) => {

  const pad = (n) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

};



const buildScanUrl = (eventId, action, token) => {

  const params = new URLSearchParams({ eventId, action, token });

  return `${window.location.origin}/quet-qr?${params.toString()}`;

};



const buildExpiryPayload = ({ expiryMode, durationMinutes, expiresAtLocal }) => {

  if (expiryMode === 'datetime') {

    if (!expiresAtLocal) return { error: 'Vui lòng chọn thời gian hết hạn.' };

    const parsed = new Date(expiresAtLocal);

    if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {

      return { error: 'Thời gian hết hạn phải ở tương lai.' };

    }

    return {

      expiryMode: 'datetime',

      expiresAt: parsed.toISOString(),

    };

  }

  return {

    expiryMode: 'duration',

    durationMinutes: Number(durationMinutes) || 60,

  };

};



const QrExpiryForm = ({ expiryMode, onModeChange, durationMinutes, onDurationChange, expiresAtLocal, onExpiresAtChange }) => (

  <div className="ev-qr-expiry-form">

    <p className="ev-qr-expiry-form__label">Thời gian hiệu lực mã QR</p>

    <div className="ev-qr-expiry-mode" role="group" aria-label="Kiểu thời gian hiệu lực">

      <button

        type="button"

        className={`ev-qr-expiry-mode__btn${expiryMode === 'duration' ? ' is-active' : ''}`}

        onClick={() => onModeChange('duration')}

      >

        Đếm ngược

      </button>

      <button

        type="button"

        className={`ev-qr-expiry-mode__btn${expiryMode === 'datetime' ? ' is-active' : ''}`}

        onClick={() => onModeChange('datetime')}

      >

        Chọn giờ

      </button>

    </div>

    {expiryMode === 'duration' ? (

      <AppSelect

        value={String(durationMinutes)}

        onChange={(e) => onDurationChange(e.target.value)}

        options={DURATION_OPTIONS}

        placeholder="Chọn thời gian"

      />

    ) : (

      <input

        type="datetime-local"

        className="ev-qr-expiry-datetime"

        value={expiresAtLocal}

        min={toLocalDatetimeValue()}

        onChange={(e) => onExpiresAtChange(e.target.value)}

      />

    )}

  </div>

);



const QrCard = ({ title, description, action, eventId, station, generating, onGenerate, onZoom }) => {

  const [qrUrl, setQrUrl] = useState('');

  const [expiryMode, setExpiryMode] = useState('duration');

  const [durationMinutes, setDurationMinutes] = useState('60');

  const [expiresAtLocal, setExpiresAtLocal] = useState(() => {

    const next = new Date(Date.now() + 60 * 60 * 1000);

    return toLocalDatetimeValue(next);

  });



  useEffect(() => {

    let cancelled = false;

    const render = async () => {

      if (!station?.active || !station?.token) {

        setQrUrl('');

        return;

      }

      try {

        const url = await QRCode.toDataURL(buildScanUrl(eventId, action, station.token), {

          width: 220,

          margin: 1,

          color: { dark: '#1e293b', light: '#ffffff' },

        });

        if (!cancelled) setQrUrl(url);

      } catch {

        if (!cancelled) setQrUrl('');

      }

    };

    render();

    return () => { cancelled = true; };

  }, [station?.active, station?.token, eventId, action]);



  const handleDownload = () => {

    if (!qrUrl) return;

    const link = document.createElement('a');

    link.href = qrUrl;

    link.download = `qr-${action}-${eventId}.png`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };



  const handleGenerateClick = () => {

    const payload = buildExpiryPayload({ expiryMode, durationMinutes, expiresAtLocal });

    if (payload.error) return onGenerate(action, null, payload.error);

    onGenerate(action, payload);

  };



  return (

    <div className="ev-qr-generate-card">

      <div className="ev-qr-generate-card__head">

        <h4>{title}</h4>

        <p>{description}</p>

      </div>

      <div className="ev-qr-generate-card__body">

        {qrUrl ? (

          <button type="button" className="ev-qr-generate-card__zoom-btn" onClick={() => onZoom({ title, qrUrl })}>

            <img src={qrUrl} alt={`Mã QR ${title}`} className="ev-qr-generate-card__img" />

          </button>

        ) : (

          <div className="ev-qr-generate-card__placeholder">

            <span>Chưa có mã QR</span>

          </div>

        )}

      </div>

      {station?.expiresAt && station?.active && (

        <p className="ev-qr-generate-card__expiry">

          Hết hạn: {new Date(station.expiresAt).toLocaleString('vi-VN')}

        </p>

      )}

      <QrExpiryForm

        expiryMode={expiryMode}

        onModeChange={setExpiryMode}

        durationMinutes={durationMinutes}

        onDurationChange={setDurationMinutes}

        expiresAtLocal={expiresAtLocal}

        onExpiresAtChange={setExpiresAtLocal}

      />

      <div className="ev-qr-generate-card__actions">

        <button

          type="button"

          className="ev-btn-primary ev-btn-sm"

          disabled={generating}

          onClick={handleGenerateClick}

        >

          {generating ? 'Đang tạo…' : station?.active ? 'Tạo mã mới' : 'Tạo mã QR'}

        </button>

        {qrUrl && (

          <>

            <button type="button" className="ev-btn-outline ev-btn-sm" onClick={handleDownload}>

              Tải xuống

            </button>

            <button type="button" className="ev-btn-outline ev-btn-sm" onClick={() => onZoom({ title, qrUrl })}>

              Phóng to

            </button>

          </>

        )}

      </div>

    </div>

  );

};



const EventQrGeneratePanel = ({ eventId, showToast }) => {

  const [checkin, setCheckin] = useState(null);

  const [checkout, setCheckout] = useState(null);

  const [loading, setLoading] = useState(true);

  const [generating, setGenerating] = useState('');

  const [zoomQr, setZoomQr] = useState(null);



  const loadQr = useCallback(async () => {

    if (!eventId) return;

    setLoading(true);

    try {

      const data = await fetchStationQr(eventId);

      if (data.success) {

        setCheckin(data.checkin || null);

        setCheckout(data.checkout || null);

      } else {

        showToast?.(data.message || 'Không tải được mã QR.', 'error');

      }

    } catch {

      showToast?.('Lỗi kết nối máy chủ.', 'error');

    } finally {

      setLoading(false);

    }

  }, [eventId, showToast]);



  useEffect(() => { loadQr(); }, [loadQr]);



  const handleGenerate = async (action, expiryPayload, validationError) => {

    if (validationError) {

      showToast?.(validationError, 'error');

      return;

    }

    setGenerating(action);

    try {

      const data = await generateStationQr(eventId, { action, ...expiryPayload });

      if (data.success) {

        showToast?.(data.message || 'Đã tạo mã QR.', 'success');

        await loadQr();

      } else {

        showToast?.(data.message || 'Tạo mã QR thất bại.', 'error');

      }

    } catch {

      showToast?.('Lỗi kết nối máy chủ.', 'error');

    } finally {

      setGenerating('');

    }

  };



  const zoomTitle = useMemo(() => zoomQr?.title || '', [zoomQr]);



  if (loading) return <p className="ev-qr-empty">Đang tải mã QR…</p>;



  return (

    <>

      <div className="ev-qr-generate-panel">

        <div className="ev-qr-generate-panel__intro">

          <h3>Mã QR check-in / check-out</h3>

          <p>

            Tạo mã QR và chiếu tại sự kiện. Sinh viên dùng điện thoại quét mã để tự check-in hoặc check-out.

            CLB, CTSV và IC-PDP không cần quét mã thay sinh viên.

          </p>

        </div>

        <div className="ev-qr-generate-grid">

          <QrCard

            title="Check-in"

            description="Sinh viên quét khi đến sự kiện"

            action="checkin"

            eventId={eventId}

            station={checkin}

            generating={generating === 'checkin'}

            onGenerate={handleGenerate}

            onZoom={setZoomQr}

          />

          <QrCard

            title="Check-out"

            description="Sinh viên quét khi rời sự kiện"

            action="checkout"

            eventId={eventId}

            station={checkout}

            generating={generating === 'checkout'}

            onGenerate={handleGenerate}

            onZoom={setZoomQr}

          />

        </div>

      </div>



      {zoomQr && (

        <div className="ev-qr-zoom-overlay" onClick={() => setZoomQr(null)} role="presentation">

          <div className="ev-qr-zoom-modal" onClick={(e) => e.stopPropagation()}>

            <h4>{zoomTitle}</h4>

            <img src={zoomQr.qrUrl} alt={zoomTitle} className="ev-qr-zoom-modal__img" />

            <div className="ev-qr-zoom-modal__actions">

              <a

                href={zoomQr.qrUrl}

                download={`qr-${zoomTitle}.png`}

                className="ev-btn-outline ev-btn-sm"

              >

                Tải xuống

              </a>

              <button type="button" className="ev-btn-primary ev-btn-sm" onClick={() => setZoomQr(null)}>

                Đóng

              </button>

            </div>

          </div>

        </div>

      )}

    </>

  );

};



export default EventQrGeneratePanel;

