import React from 'react';
import { Modal, Button } from 'antd';
import type { ModalProps } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

/* ============================================================ */
/*  FormSection — قسم داخل النافذة المنبثقة                      */
/* ============================================================ */

interface FormSectionProps {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

export function FormSection({ icon, title, children }: FormSectionProps) {
  return (
    <div className="app-modal-section">
      <div className="app-modal-section-header">
        {icon && <span className="app-modal-section-icon">{icon}</span>}
        <span className="app-modal-section-title">{title}</span>
        <span className="app-modal-section-line" />
      </div>
      {children}
    </div>
  );
}

/* ============================================================ */
/*  AppModal — النافذة المنبثقة الاحترافية                        */
/* ============================================================ */

export interface AppModalProps extends Omit<ModalProps, 'title'> {
  /** عنوان النافذة */
  title: string;
  /** وصف مختصر تحت العنوان */
  subtitle?: string;
  /** أيقونة تظهر بجانب العنوان */
  icon?: React.ReactNode;
  /** لون الأيقونة (gradient start) — افتراضي: ذهبي */
  iconColor?: string;
  /** لون نهاية التدرّج للأيقونة */
  iconColorTo?: string;
  /** نص زر الحفظ */
  okText?: string;
  /** نص زر الإلغاء */
  cancelText?: string;
  /** لون زر الحفظ — افتراضي: أخضر */
  okColor?: string;
  /** إخفاء الأزرار السفلية (عند استخدام أزرار مخصصة) */
  hideFooter?: boolean;
  /** عرض النافذة */
  width?: number;
  children?: React.ReactNode;
}

export function AppModal({
  title,
  subtitle,
  icon,
  iconColor = '#C9A227',
  iconColorTo,
  okText = 'حفظ',
  cancelText = 'إلغاء',
  okColor = '#27ae60',
  hideFooter = false,
  width = 680,
  children,
  ...rest
}: AppModalProps) {
  const gradientEnd = iconColorTo || iconColor;

  return (
    <Modal
      {...rest}
      width={width}
      className="app-modal"
      style={{ top: 24 }}
      destroyOnClose
      footer={
        hideFooter ? null : (
          <div className="app-modal-footer">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={rest.onOk}
              loading={rest.confirmLoading}
              className="app-modal-save-btn"
              style={{
                '--btn-color': okColor,
              } as React.CSSProperties}
            >
              {okText}
            </Button>
            <Button onClick={rest.onCancel} className="app-modal-cancel-btn">
              {cancelText}
            </Button>
          </div>
        )
      }
    >
      {/* ===== Header ===== */}
      <div className="app-modal-header">
        {icon && (
          <div
            className="app-modal-icon"
            style={{
              background: `linear-gradient(135deg, ${iconColor}, ${gradientEnd})`,
            }}
          >
            {icon}
          </div>
        )}
        <div className="app-modal-titles">
          <div className="app-modal-title">{title}</div>
          {subtitle && <div className="app-modal-subtitle">{subtitle}</div>}
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="app-modal-body">
        {children}
      </div>
    </Modal>
  );
}
