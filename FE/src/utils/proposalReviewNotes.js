/**
 * Ghi chú duyệt chỉ hiển thị khi còn liên quan chu kỳ hiện tại.
 * Đơn mới gửi lại (pending_icpdp) không show note/lý do từ chu kỳ trước.
 */
export const getVisibleProposalReviewNotes = (proposal) => {
  const statusKey = String(proposal?.statusKey || '').trim();
  if (statusKey === 'pending_icpdp') {
    return { icpdpNote: '', ctsvNote: '', rejectionReason: '' };
  }
  return {
    icpdpNote: proposal?.icpdpNote || '',
    ctsvNote: proposal?.ctsvNote || '',
    rejectionReason: proposal?.rejectionReason || '',
  };
};

export const hasVisibleProposalReviewNotes = (proposal) => {
  const notes = getVisibleProposalReviewNotes(proposal);
  return Boolean(notes.icpdpNote || notes.ctsvNote || notes.rejectionReason);
};
