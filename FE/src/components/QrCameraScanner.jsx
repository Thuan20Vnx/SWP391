import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseScanQrPayload } from '../utils/parseScanQrUrl';

const QrCameraScanner = ({ onScan, onError, paused = false }) => {
  const regionId = useId().replace(/:/g, '');
  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const [cameraError, setCameraError] = useState('');
  const [starting, setStarting] = useState(true);
  const [decoded, setDecoded] = useState(false);

  useEffect(() => {
    if (paused) return undefined;

    handledRef.current = false;
    let cancelled = false;
    const scanner = new Html5Qrcode(regionId, { verbose: false });
    scannerRef.current = scanner;

    // stop() reject nếu scanner chưa/không còn chạy; clear() là hàm sync.
    const stopScanner = () =>
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          try {
            scanner.clear();
          } catch {
            /* vùng render đã bị React gỡ */
          }
        });

    const handleDecoded = (decodedText) => {
      if (handledRef.current || cancelled) return;
      const payload = parseScanQrPayload(decodedText);
      if (!payload) {
        onError?.('Mã QR không hợp lệ. Hãy quét mã do ban tổ chức hiển thị tại sự kiện.');
        return;
      }
      handledRef.current = true;
      setDecoded(true);
      onScan?.(payload);
      stopScanner();
    };

    setStarting(true);
    setCameraError('');
    setDecoded(false);

    // Giữ promise của start() để cleanup đợi xong mới stop. Nếu stop ngay khi
    // start còn dang dở (StrictMode mount đôi, bấm Quét lại đổi key), stop()
    // reject vì "chưa chạy" còn stream camera của start cũ vẫn giữ thiết bị
    // → lần mở sau chỉ thấy khung đen.
    const startPromise = scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
            return { width: edge, height: edge };
          },
          aspectRatio: 1,
        },
        handleDecoded,
        () => {}
      )
      .then(() => {
        if (cancelled) {
          stopScanner();
          return;
        }
        setStarting(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCameraError('Không mở được camera. Hãy cấp quyền camera hoặc nhập mã điểm danh bên dưới.');
        setStarting(false);
        onError?.('Không mở được camera.');
      });

    return () => {
      cancelled = true;
      startPromise.finally(stopScanner);
      scannerRef.current = null;
    };
  }, [regionId, onScan, onError, paused]);

  return (
    <div className="qr-scan-camera">
      <div className="qr-scan-camera__frame">
        <div id={regionId} className="qr-scan-camera__viewport" aria-label="QR scanner viewfinder" />
        {(starting || decoded) && !cameraError && (
          <div className="qr-scan-camera__overlay">
            <span className="btn-spinner qr-scan-camera__spinner" aria-hidden="true" />
            <p>{decoded ? 'Đang xử lý mã QR…' : 'Đang mở camera…'}</p>
          </div>
        )}
      </div>
      {cameraError ? (
        <p className="qr-scan-camera__error" role="alert">
          {cameraError}
        </p>
      ) : (
        <p className="qr-scan-camera__hint">Đưa mã QR tại cửa vào hoặc cửa ra sự kiện vào khung hình.</p>
      )}
    </div>
  );
};

export default QrCameraScanner;
