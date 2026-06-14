import React from 'react';
import AutoGrowTextarea from '../ui/AutoGrowTextarea';

const EventIntroFields = ({
  description = '',
  learningOutcomes = ['', '', ''],
  onDescriptionChange,
  onLearningOutcomeChange,
  onAddLearningOutcome,
  onRemoveLearningOutcome,
  disabled = false,
  showAiOptimize = false,
  onAiOptimize,
  aiLoading = false,
  descriptionRequired = false,
}) => (
  <section className="ctsv-form-section event-intro-fields">
    <div className="event-intro-fields__heading">
      <span className="event-detail-page__title-accent" aria-hidden="true" />
      <h2 className="event-intro-fields__title">Giới thiệu sự kiện</h2>
      <p className="event-intro-fields__hint">
        Nội dung hiển thị trong khối giới thiệu trên trang chi tiết công khai (mỗi đoạn cách nhau một dòng trống).
      </p>
    </div>

    <div className="ctsv-form-section-body">
      <div className="ctsv-field">
        <div className="ctsv-field-label-row">
          <span className="ctsv-field-label">
            Mô tả sự kiện{descriptionRequired ? ' *' : ''}
          </span>
          {showAiOptimize && (
            <button
              type="button"
              className="ctsv-ai-link"
              disabled={disabled || aiLoading}
              onClick={onAiOptimize}
            >
              {aiLoading ? 'Đang tối ưu…' : 'AI Tối ưu mô tả'}
            </button>
          )}
        </div>
        <AutoGrowTextarea
          name="description"
          value={description}
          onChange={onDescriptionChange}
          className="ctsv-textarea event-intro-fields__textarea"
          minRows={5}
          placeholder="Giới thiệu tổng quan về sự kiện, đối tượng tham gia và giá trị mang lại…"
          disabled={disabled}
          required={descriptionRequired}
          spellCheck={false}
        />
      </div>

      <div className="ctsv-field event-intro-fields__outcomes">
        <span className="ctsv-field-label">Bạn sẽ học được gì?</span>
        <p className="event-intro-fields__subhint">
          Mỗi dòng là một mục trong danh sách trên trang chi tiết (tối thiểu 1 mục).
        </p>
        <ul className="event-intro-fields__outcome-list">
          {learningOutcomes.map((item, index) => (
            <li key={`outcome-${index}`} className="event-intro-fields__outcome-row">
              <span className="event-intro-fields__outcome-num" aria-hidden="true">
                {index + 1}
              </span>
              <input
                type="text"
                className="ctsv-input"
                value={item}
                onChange={(e) => onLearningOutcomeChange(index, e.target.value)}
                placeholder="VD: Nắm vững kiến thức nền tảng và ứng dụng thực tế…"
                disabled={disabled}
                spellCheck={false}
                autoCorrect="off"
                autoComplete="off"
              />
              {learningOutcomes.length > 1 && (
                <button
                  type="button"
                  className="ctsv-ticket-remove event-intro-fields__remove"
                  onClick={() => onRemoveLearningOutcome(index)}
                  disabled={disabled}
                  aria-label={`Xóa mục ${index + 1}`}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="ctsv-btn-add-ticket"
          onClick={onAddLearningOutcome}
          disabled={disabled || learningOutcomes.length >= 8}
        >
          + Thêm mục
        </button>
      </div>
    </div>
  </section>
);

export default EventIntroFields;
