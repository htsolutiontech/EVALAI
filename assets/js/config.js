/* =============================================================
   EvalAIH — cấu hình triển khai
   Sửa file này khi đổi email nhận, nhà cung cấp gửi form, webhook.
============================================================= */
'use strict';

window.EVALAI_CONFIG = Object.freeze({
  VERSION: '2.1.1',
  BUILD_DATE: '2026-10-29',

  /* ---- Email nhận góp ý và dữ liệu chuyên gia ---- */
  RECIPIENT_EMAIL: 'htsolutiontech@gmail.com',

  /* ---- Kênh chuyển tiếp form ----
     'formsubmit' : FormSubmit.co (miễn phí, không cần backend).
                    Lần gửi ĐẦU TIÊN, FormSubmit gửi email kích hoạt tới RECIPIENT_EMAIL;
                    cần bấm "Activate Form" trong email đó thì các lần sau mới chuyển tiếp.
                    Sau khi kích hoạt, FormSubmit cấp một chuỗi bí danh — điền vào
                    FORMSUBMIT_ALIAS để không lộ địa chỉ email trong mã nguồn.
     'web3forms'  : Web3Forms.com — cần WEB3FORMS_ACCESS_KEY đăng ký bằng email nhận.
     'webhook'    : backend riêng của HealthV (khuyến nghị cho production, lưu trữ tại VN). */
  MAIL_PROVIDER: 'formsubmit',
  FORMSUBMIT_ALIAS: '',          // ví dụ: 'a1b2c3d4e5f6...' (sau khi kích hoạt)
  WEB3FORMS_ACCESS_KEY: '',

  /* ---- Đồng bộ kho tri thức chuyên gia tới hệ thống huấn luyện ----
     URL webhook nhận JSON (Google Apps Script / API HealthV). Để trống = chỉ gửi email.
     Mẫu Apps Script: integrations/google-apps-script.gs */
  KB_WEBHOOK_URL: '',

  /* ---- Tra cứu bằng chứng trực tuyến (API công khai, hỗ trợ CORS) ---- */
  CROSSREF_API: 'https://api.crossref.org/works/',
  PUBMED_API: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi',
  LOOKUP_TIMEOUT_MS: 8000,

  /* ---- Ngưỡng vận hành ---- */
  ECS_HUMAN_REVIEW_THRESHOLD: 70,   // ECS dưới ngưỡng → bắt buộc chuyên gia review
  KB_VALIDATION_QUORUM: 2,          // số chuyên gia độc lập đồng thuận để mục KB thành "validated"
  KB_MATCH_THRESHOLD: 0.34,         // ngưỡng tương đồng từ khóa để áp dụng mục KB vào luận điểm
  SUBMIT_COOLDOWN_MS: 30000,        // chống gửi lặp

  /* ---- Lưu ý pháp lý bắt buộc hiển thị ---- */
  DISCLAIMER_VI: 'EVALAI chỉ đánh giá độ tin cậy các nền tảng AI y tế, không dùng cho các quyết định chẩn đoán Y khoa, và hệ thống có thể sai sót, thông tin cần đánh giá khách quan từ bác sỹ chuyên môn.',
  DISCLAIMER_EN: 'EVALAI only assesses the reliability of healthcare AI platforms. It must not be used for medical diagnostic decisions. The system can make errors; results require objective review by qualified clinicians.'
});
