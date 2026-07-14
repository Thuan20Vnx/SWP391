// Danh sách ngân hàng phổ biến. `code` là giá trị tương thích với qr.sepay.vn / VietQR.
export const BANK_OPTIONS = [
  { code: 'Vietcombank', name: 'Vietcombank (VCB)' },
  { code: 'Techcombank', name: 'Techcombank (TCB)' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'VietinBank', name: 'VietinBank (CTG)' },
  { code: 'Agribank', name: 'Agribank' },
  { code: 'MBBank', name: 'MB Bank (MB)' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPBank', name: 'VPBank (VPB)' },
  { code: 'Sacombank', name: 'Sacombank (STB)' },
  { code: 'TPBank', name: 'TPBank (TPB)' },
  { code: 'VIB', name: 'VIB' },
  { code: 'SHB', name: 'SHB' },
  { code: 'HDBank', name: 'HDBank (HDB)' },
  { code: 'MSB', name: 'MSB' },
  { code: 'OCB', name: 'OCB' },
  { code: 'SeABank', name: 'SeABank' },
  { code: 'Eximbank', name: 'Eximbank (EIB)' },
  { code: 'LienVietPostBank', name: 'LPBank (LienVietPostBank)' },
  { code: 'NamABank', name: 'Nam A Bank' },
  { code: 'SCB', name: 'SCB' },
];

export const findBankByCode = (code) =>
  BANK_OPTIONS.find((b) => b.code === code) || null;

// Tạo URL ảnh QR chuyển khoản VietQR (cùng cơ chế SePay đang dùng để CHI tiền cho đối tác).
export const buildPayoutQrUrl = ({ accountNumber, bankCode }, amount, description) => {
  if (!accountNumber || !bankCode) return '';
  const params = new URLSearchParams({
    acc: String(accountNumber),
    bank: String(bankCode),
  });
  if (amount && Number(amount) > 0) params.set('amount', String(Math.round(Number(amount))));
  if (description) params.set('des', String(description));
  return `https://qr.sepay.vn/img?${params.toString()}`;
};
