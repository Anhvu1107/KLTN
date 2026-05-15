import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import {
  Presentation,
  PresentationFile,
  column,
  row,
  grid,
  layers,
  panel,
  text,
  image,
  shape,
  rule,
  fill,
  hug,
  fixed,
  fr,
  auto,
} from "@oai/artifact-tool";
import { stroke } from "@oai/artifact-tool/presentation-jsx";

const OUT = "D:/KLTN/ppt_work/output";
const PREVIEWS = path.join(OUT, "previews");
const PPTX = path.join(OUT, "AURA_ARCHIVE_PPT_DETAILED.pptx");
const MONTAGE = path.join(OUT, "AURA_ARCHIVE_preview_montage.png");
const REPORT = path.join(OUT, "AURA_ARCHIVE_QA_report.json");

await fs.mkdir(PREVIEWS, { recursive: true });

const W = 1920;
const H = 1080;
const TOTAL = 30;

const C = {
  bg: "#FFFDF8",
  white: "#FFFFFF",
  ink: "#151515",
  muted: "#647067",
  soft: "#F7EFE3",
  line: "#E8DDCF",
  sage: "#77B8A4",
  mint: "#DDF4EB",
  mint2: "#BFE7DB",
  gold: "#D9B760",
  coral: "#F39A8A",
  rose: "#F7DDE0",
  wine: "#7E3D4A",
  navy: "#25384A",
  blue: "#87B8D6",
};

const screenshotPath = "D:/KLTN/client/prod_miku_test.png";
const mascotPath = "D:/KLTN/model_icon.png";

const presentation = Presentation.create({
  slideSize: { width: W, height: H },
});

const base = {
  title: { fontSize: 48, bold: true, color: C.ink, lineSpacing: 1.05 },
  h1: { fontSize: 84, bold: true, color: C.ink, lineSpacing: 0.98 },
  h2: { fontSize: 34, bold: true, color: C.ink, lineSpacing: 1.1 },
  body: { fontSize: 24, color: C.muted, lineSpacing: 1.25 },
  small: { fontSize: 17, color: C.muted, lineSpacing: 1.2 },
  mono: { fontSize: 19, color: C.navy, lineSpacing: 1.25 },
  kicker: { fontSize: 16, bold: true, color: C.wine, letterSpacing: 1.8 },
};

function T(value, opts = {}) {
  return text(value, {
    name: opts.name,
    width: opts.width ?? fill,
    height: opts.height ?? hug,
    columnSpan: opts.columnSpan,
    rowSpan: opts.rowSpan,
    style: {
      ...base.body,
      ...(opts.style ?? {}),
    },
  });
}

function line(color = C.line, width = 1) {
  return stroke(color, width);
}

function bgLayers(content, opts = {}) {
  const accent = opts.accent ?? C.sage;
  return layers({ name: "slide-layers", width: fill, height: fill }, [
    shape({ name: "background", width: fill, height: fill, fill: opts.bg ?? C.bg }),
    shape({ name: "top-band", width: fill, height: fixed(16), fill: accent }),
    shape({ name: "bottom-band", width: fill, height: fixed(8), fill: C.gold }),
    content,
  ]);
}

function header(title, kicker, slideNo, accent = C.sage, subtitle) {
  return column({ name: "header", width: fill, height: hug, gap: 13 }, [
    row({ width: fill, height: hug, gap: 16, align: "center" }, [
      shape({ width: fixed(42), height: fixed(10), fill: accent, borderRadius: "rounded-full" }),
      T(kicker.toUpperCase(), { width: fill, style: base.kicker }),
      T(`${String(slideNo).padStart(2, "0")}/${TOTAL}`, {
        width: hug,
        style: { ...base.small, color: C.wine, bold: true },
      }),
    ]),
    T(title, { name: "slide-title", style: base.title }),
    subtitle
      ? T(subtitle, {
          name: "slide-subtitle",
          width: fill,
          style: { fontSize: 24, color: C.muted, lineSpacing: 1.25 },
        })
      : rule({ name: "title-rule", width: fixed(200), stroke: accent, weight: 4 }),
  ]);
}

function addStandardSlide({
  title,
  kicker = "AURA ARCHIVE",
  slideNo,
  accent = C.sage,
  subtitle,
  body,
  notes,
  gap = 28,
}) {
  const slide = presentation.slides.add();
  const root = column(
    {
      name: "content-root",
      width: fill,
      height: fill,
      padding: { x: 86, y: 60 },
      gap,
    },
    [header(title, kicker, slideNo, accent, subtitle), ...body],
  );
  slide.compose(bgLayers(root, { accent }), {
    frame: { left: 0, top: 0, width: W, height: H },
    baseUnit: 8,
  });
  if (notes) slide.speakerNotes.setText(notes);
  return slide;
}

function tag(label, color = C.sage, opts = {}) {
  const tagWidth = opts.width ?? hug;
  return panel(
    {
      name: opts.name,
      width: tagWidth,
      height: hug,
      fill: opts.fill ?? C.white,
      line: line(color, 1),
      borderRadius: "rounded-full",
      padding: { x: 18, y: 9 },
    },
    T(label, {
      width: opts.width ? fill : hug,
      style: {
        fontSize: opts.fontSize ?? 17,
        bold: true,
        color: opts.textColor ?? C.ink,
        alignment: opts.alignment ?? "center",
      },
    }),
  );
}

function callout(title, body, accent = C.sage, opts = {}) {
  return row({ width: opts.width ?? fill, height: hug, gap: 18, align: "start" }, [
    shape({ width: fixed(10), height: fixed(opts.barHeight ?? 92), fill: accent, borderRadius: "rounded-full" }),
    column({ width: fill, height: hug, gap: 6 }, [
      T(title, { style: { fontSize: opts.titleSize ?? 28, bold: true, color: C.ink } }),
      T(body, { style: { fontSize: opts.bodySize ?? 21, color: C.muted, lineSpacing: 1.22 } }),
    ]),
  ]);
}

function compactCard(title, body, accent = C.sage, opts = {}) {
  return panel(
    {
      width: opts.width ?? fill,
      height: opts.height ?? hug,
      fill: opts.fill ?? C.white,
      line: line(opts.line ?? C.line, 1),
      borderRadius: "rounded-lg",
      padding: opts.padding ?? { x: 22, y: 18 },
    },
    column({ width: fill, height: hug, gap: 9 }, [
      row({ width: fill, height: hug, gap: 10, align: "center" }, [
        shape({ width: fixed(11), height: fixed(34), fill: accent, borderRadius: "rounded-full" }),
        T(title, { style: { fontSize: opts.titleSize ?? 24, bold: true, color: C.ink } }),
      ]),
      T(body, { style: { fontSize: opts.bodySize ?? 19, color: C.muted, lineSpacing: 1.2 } }),
    ]),
  );
}

function nodeBox(title, sub, accent = C.sage, width = 240, height = 110) {
  return panel(
    {
      width: fixed(width),
      height: fixed(height),
      fill: C.white,
      line: line(accent, 1.4),
      borderRadius: "rounded-lg",
      padding: { x: 18, y: 16 },
    },
    column({ width: fill, height: fill, gap: 6, justify: "center" }, [
      T(title, { style: { fontSize: 22, bold: true, color: C.ink, alignment: "center" } }),
      sub
        ? T(sub, {
            style: { fontSize: 15, color: C.muted, lineSpacing: 1.12, alignment: "center" },
          })
        : T("", { style: { fontSize: 1, color: C.white } }),
    ]),
  );
}

function arrow(color = C.gold) {
  return T("→", { width: fixed(42), style: { fontSize: 35, bold: true, color, alignment: "center" } });
}

function tableCell(value, opts = {}) {
  return panel(
    {
      width: fill,
      height: opts.height ?? hug,
      fill: opts.fill ?? C.white,
      line: opts.line === false ? undefined : line(C.line, 1),
      borderRadius: opts.rounded ? "rounded-lg" : undefined,
      padding: opts.padding ?? { x: 13, y: 11 },
      columnSpan: opts.columnSpan,
    },
    T(value, {
      width: fill,
      style: {
        fontSize: opts.fontSize ?? 18,
        bold: opts.bold ?? false,
        color: opts.color ?? C.ink,
        lineSpacing: 1.17,
      },
    }),
  );
}

function simpleTable({ headers, rows, columns, fontSize = 17, headerFill = C.mint }) {
  const cells = [];
  for (const h of headers) {
    cells.push(tableCell(h, { fill: headerFill, bold: true, fontSize, color: C.navy }));
  }
  rows.forEach((r, idx) => {
    r.forEach((c) =>
      cells.push(
        tableCell(c, {
          fill: idx % 2 === 0 ? C.white : "#FBF6EE",
          fontSize,
          color: C.ink,
        }),
      ),
    );
  });
  return grid(
    { name: "authored-table", width: fill, height: hug, columns, rowGap: 0, columnGap: 0 },
    cells,
  );
}

function twoTrack(leftTitle, leftItems, rightTitle, rightItems, accentLeft = C.sage, accentRight = C.coral) {
  return grid(
    { width: fill, height: hug, columns: [fr(1), fr(1)], columnGap: 38, rowGap: 18, alignItems: "start" },
    [
      compactCard(leftTitle, leftItems.join("\n"), accentLeft, {
        height: hug,
        bodySize: 22,
        titleSize: 29,
        fill: "#FEFCF8",
      }),
      compactCard(rightTitle, rightItems.join("\n"), accentRight, {
        height: hug,
        bodySize: 22,
        titleSize: 29,
        fill: "#FEFCF8",
      }),
    ],
  );
}

const notes = {
  intro:
    "Nhóm mở đầu: nhấn mạnh đề tài không chỉ là e-commerce thông thường mà là luxury resale có độ tin cậy, tư vấn và quản trị.",
  arch:
    "Nhóm kiến trúc: hệ thống chia rõ frontend Nuxt 3, backend Express.js, PostgreSQL, AI, payment và realtime.",
  db:
    "Nhóm database: điểm quan trọng là variants đại diện cho từng item vật lý và order_items lưu snapshot để bảo toàn lịch sử.",
  ai:
    "Nhóm AI: AI Stylist phân loại intent, trích xuất entity, tìm sản phẩm thật trong database rồi mới sinh phản hồi.",
  admin:
    "Nhóm admin: admin không chỉ quản lý catalog và order mà còn quản lý content, setting, AI prompt và chat session.",
  end:
    "Nhóm kết luận: tổng kết hệ thống full-stack đã có demo, kiến trúc mở rộng và hướng phát triển rõ.",
};

// Slide 1
{
  const slide = presentation.slides.add();
  const root = grid(
    {
      name: "cover-root",
      width: fill,
      height: fill,
      columns: [fr(0.95), fr(1.05)],
      columnGap: 54,
      padding: { x: 92, y: 70 },
    },
    [
      column({ width: fill, height: fill, gap: 32, justify: "center" }, [
        row({ width: fill, height: hug, gap: 14, align: "center" }, [
          shape({ width: fixed(52), height: fixed(10), fill: C.sage, borderRadius: "rounded-full" }),
          T("KHÓA LUẬN TỐT NGHIỆP", { width: fill, style: base.kicker }),
        ]),
        T("AURA\nARCHIVE", {
          name: "cover-title",
          width: fill,
          style: { ...base.h1, fontSize: 104, lineSpacing: 0.92, letterSpacing: 5 },
        }),
        T("Luxury resale & consignment fashion e-commerce platform tích hợp AI Stylist", {
          width: fill,
          style: { fontSize: 30, color: C.navy, lineSpacing: 1.2 },
        }),
        row({ width: fill, height: hug, gap: 12 }, [
          tag("Nuxt 3", C.sage, { width: fixed(112) }),
          tag("Express.js", C.gold, { width: fixed(132) }),
          tag("PostgreSQL", C.blue, { width: fixed(150) }),
          tag("AI Stylist", C.coral, { width: fixed(136) }),
        ]),
      ]),
      column({ width: fill, height: fill, gap: 18, justify: "center" }, [
        panel(
          {
            width: fill,
            height: fixed(610),
            fill: C.white,
            line: line(C.line, 1),
            borderRadius: "rounded-lg",
            padding: 18,
          },
          image({
            name: "homepage-ai-screenshot",
            path: screenshotPath,
            width: fill,
            height: fill,
            fit: "contain",
            borderRadius: "rounded-lg",
            alt: "AURA ARCHIVE homepage with AI Stylist chat",
          }),
        ),
        T("Homepage demo với AI Stylist chat tích hợp trực tiếp trong trải nghiệm mua sắm.", {
          style: { fontSize: 21, color: C.muted, alignment: "center" },
        }),
      ]),
    ],
  );
  slide.compose(bgLayers(root, { accent: C.sage }), {
    frame: { left: 0, top: 0, width: W, height: H },
    baseUnit: 8,
  });
  slide.speakerNotes.setText(notes.intro);
}

addStandardSlide({
  slideNo: 2,
  kicker: "Bối cảnh",
  title: "Vì sao chọn AURA ARCHIVE?",
  subtitle: "Luxury resale cần nhiều niềm tin và tư vấn hơn một website bán hàng phổ thông.",
  accent: C.coral,
  notes: notes.intro,
  body: [
    grid(
      { width: fill, height: fill, columns: [fr(1), fr(1)], rows: [fr(1), fr(1)], columnGap: 32, rowGap: 26 },
      [
        callout("E-commerce đã quen thuộc", "Người dùng sẵn sàng mua sắm online, nhưng kỳ vọng trải nghiệm nhanh, đẹp và rõ ràng.", C.sage),
        callout("Luxury resale có rủi ro riêng", "Khách hàng cần biết tình trạng, chất liệu, size, độ tin cậy và giá trị của từng item.", C.gold),
        callout("Tư vấn là một phần sản phẩm", "Quyết định mua hàng cao cấp thường cần bối cảnh: phối đồ, mục đích dùng, ngân sách.", C.coral),
        callout("AI tạo khác biệt trải nghiệm", "AI Stylist giúp khám phá sản phẩm nhanh hơn và giảm tải cho chăm sóc khách hàng.", C.blue),
      ],
    ),
  ],
});

addStandardSlide({
  slideNo: 3,
  kicker: "Bài toán",
  title: "Không chỉ là bán hàng online",
  subtitle: "Hệ thống phải đồng thời giải quyết niềm tin, tư vấn và vận hành.",
  accent: C.gold,
  notes: notes.intro,
  body: [
    grid({ width: fill, height: fill, columns: [fr(1), fr(1), fr(1)], columnGap: 28 }, [
      compactCard("Người mua thiếu thông tin", "Khó đánh giá condition, size, material, authenticity và mức giá nếu chỉ nhìn danh sách sản phẩm.", C.gold, { height: fill, titleSize: 28, bodySize: 22 }),
      compactCard("Catalog tĩnh chưa đủ", "Website thông thường chưa tư vấn theo ngữ cảnh cá nhân, dịp dùng hoặc phong cách của khách.", C.coral, { height: fill, titleSize: 28, bodySize: 22 }),
      compactCard("Admin cần một trung tâm", "Sản phẩm, variant, đơn hàng, user, coupon, content, chat và AI cần được quản trị thống nhất.", C.sage, { height: fill, titleSize: 28, bodySize: 22 }),
    ]),
  ],
});

addStandardSlide({
  slideNo: 4,
  kicker: "Mục tiêu",
  title: "Xây một nền tảng full-stack có thể vận hành thực tế",
  accent: C.sage,
  notes: notes.intro,
  body: [
    grid({ width: fill, height: fill, columns: [fr(1.1), fr(0.9)], columnGap: 42 }, [
      column({ width: fill, height: fill, gap: 24, justify: "center" }, [
        T("Mục tiêu tổng quát", { style: { ...base.kicker, color: C.wine } }),
        T("AURA ARCHIVE kết hợp trải nghiệm mua sắm luxury, backend nghiệp vụ, database resale và AI Stylist trong một sản phẩm demo hoàn chỉnh.", {
          style: { fontSize: 39, bold: true, color: C.ink, lineSpacing: 1.12 },
        }),
      ]),
      grid({ width: fill, height: fill, columns: [fr(1), fr(1)], rowGap: 16, columnGap: 16 }, [
        compactCard("Frontend", "Nuxt 3, responsive, i18n Việt/Anh", C.sage),
        compactCard("Backend", "REST API Express.js + Sequelize", C.blue),
        compactCard("Commerce", "Cart, checkout, order, payment, review", C.gold),
        compactCard("Admin", "Dashboard vận hành và quản trị nội dung", C.coral),
        compactCard("AI", "Chat + voice tư vấn theo ngữ cảnh", C.wine),
        compactCard("Deploy", "Docker Compose + Nginx reverse proxy", C.navy),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 5,
  kicker: "Phạm vi",
  title: "Phạm vi đề tài được giữ rõ để demo mạch lạc",
  accent: C.blue,
  notes: notes.intro,
  body: [
    twoTrack(
      "Trong phạm vi",
      [
        "Website khách hàng, auth, catalog, search/filter",
        "Cart, checkout, order, payment, wishlist, review",
        "Admin dashboard, product, variant, order, user",
        "Content marketing: banner, blog, popup, page content",
        "AI Stylist chat, voice, Live2D mascot",
        "Docker, Nginx, PostgreSQL",
      ],
      "Ngoài phạm vi hiện tại",
      [
        "Mobile app native",
        "Inventory nhiều kho/cửa hàng phức tạp",
        "ERP/CRM enterprise riêng",
        "AI training service tách biệt ngoài backend",
      ],
      C.sage,
      C.coral,
    ),
  ],
});

addStandardSlide({
  slideNo: 6,
  kicker: "Sản phẩm",
  title: "AURA ARCHIVE là commerce platform cho luxury archive items",
  accent: C.wine,
  notes: notes.intro,
  body: [
    grid({ width: fill, height: fill, columns: [fr(0.95), fr(1.05)], columnGap: 44 }, [
      column({ width: fill, height: fill, gap: 22, justify: "center" }, [
        T("Định vị", { style: { ...base.kicker, color: C.wine } }),
        T("Một website thương mại điện tử cho hàng thời trang cao cấp đã qua sử dụng, nhấn vào tính tuyển chọn, trải nghiệm sang trọng và tư vấn cá nhân hóa.", {
          style: { fontSize: 36, bold: true, color: C.ink, lineSpacing: 1.13 },
        }),
      ]),
      column({ width: fill, height: fill, gap: 18, justify: "center" }, [
        callout("Tin cậy", "Thông tin item rõ hơn: brand, condition, variant, stock, snapshot đơn hàng.", C.gold),
        callout("Cá nhân hóa", "AI Stylist hỗ trợ hỏi đáp, gợi ý sản phẩm và phối đồ theo nhu cầu.", C.coral),
        callout("Vận hành được", "Admin quản lý catalog, content, coupon, chat và setting trong cùng hệ thống.", C.sage),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 7,
  kicker: "Actor",
  title: "Các nhóm người dùng và nhu cầu chính",
  accent: C.sage,
  notes: notes.arch,
  body: [
    simpleTable({
      columns: [fr(0.55), fr(0.9), fr(1.55)],
      headers: ["Actor", "Vai trò", "Nhu cầu chính"],
      fontSize: 19,
      rows: [
        ["Guest", "Khách chưa đăng nhập", "Xem sản phẩm, tìm kiếm, đọc blog, chat AI, đăng ký/đăng nhập"],
        ["Customer", "Khách có tài khoản", "Mua hàng, wishlist, địa chỉ, đơn hàng, review và hồ sơ cá nhân"],
        ["Admin", "Quản trị viên", "Quản lý sản phẩm, đơn hàng, user, coupon, content, AI config và chat"],
        ["Payment Gateway", "Cổng thanh toán", "Xử lý giao dịch, callback, IPN/webhook"],
        ["AI / Email", "Dịch vụ ngoài", "Sinh phản hồi tư vấn, gửi OTP, reset password và thông báo"],
      ],
    }),
  ],
});

addStandardSlide({
  slideNo: 8,
  kicker: "Kiến trúc",
  title: "Luồng hệ thống tổng quan",
  accent: C.gold,
  notes: notes.arch,
  body: [
    column({ width: fill, height: fill, gap: 34, justify: "center" }, [
      row({ width: fill, height: hug, gap: 14, align: "center", justify: "center" }, [
        nodeBox("User / Admin", "Trình duyệt", C.gold, 210),
        arrow(),
        nodeBox("Nuxt Client", "Vue 3, Pinia, i18n", C.sage, 250),
        arrow(),
        nodeBox("Express API", "REST, auth, business", C.blue, 250),
        arrow(),
        nodeBox("PostgreSQL", "Data store", C.wine, 230),
      ]),
      row({ width: fill, height: hug, gap: 14, align: "center", justify: "center" }, [
        nodeBox("Nginx", "Reverse proxy", C.navy, 210),
        arrow(C.sage),
        nodeBox("Socket.IO", "Realtime chat", C.coral, 230),
        arrow(C.sage),
        nodeBox("AI Stylist", "Gemini/OpenAI + rules", C.gold, 270),
        arrow(C.sage),
        nodeBox("Payment / Email", "VNPay, MoMo, PayPal", C.blue, 280),
      ]),
      T("Frontend hiển thị trải nghiệm mua sắm; backend xử lý nghiệp vụ, bảo mật, thanh toán, AI và realtime; PostgreSQL lưu dữ liệu lõi.", {
        style: { fontSize: 26, color: C.muted, alignment: "center" },
      }),
    ]),
  ],
});

addStandardSlide({
  slideNo: 9,
  kicker: "Stack",
  title: "Công nghệ sử dụng được chia theo lớp trách nhiệm",
  accent: C.coral,
  notes: notes.arch,
  body: [
    simpleTable({
      columns: [fr(0.7), fr(1.25), fr(1.4)],
      headers: ["Lớp", "Công nghệ", "Vai trò"],
      fontSize: 17,
      rows: [
        ["Frontend", "Nuxt 3, Vue 3, Tailwind CSS", "Routing, UI, responsive, component app"],
        ["State / i18n", "Pinia, persisted state, @nuxtjs/i18n", "Auth, cart, user state, song ngữ Việt/Anh"],
        ["Backend", "Express.js, Sequelize", "REST API, service layer, ORM model/association"],
        ["Database", "PostgreSQL", "Dữ liệu e-commerce, JSONB, enum, index"],
        ["Realtime / AI", "Socket.IO, Gemini/OpenAI SDK", "Chat realtime, AI chat/voice, product advisory"],
        ["Payment / Docs / Deploy", "VNPay, MoMo, PayPal, Swagger, Docker, Nginx", "Thanh toán, API docs, đóng gói và reverse proxy"],
      ],
    }),
  ],
});

addStandardSlide({
  slideNo: 10,
  kicker: "Mã nguồn",
  title: "Cấu trúc thư mục tách rõ client, server và hạ tầng",
  accent: C.blue,
  notes: notes.arch,
  body: [
    grid({ width: fill, height: fill, columns: [fr(1.1), fr(0.9)], columnGap: 40 }, [
      panel(
        { width: fill, height: fill, fill: C.white, line: line(C.line, 1), borderRadius: "rounded-lg", padding: { x: 28, y: 24 } },
        T(
          "KLTN/\n├─ client/       Nuxt 3 frontend\n│  ├─ pages/     routes customer/admin/auth\n│  ├─ components/ UI components\n│  ├─ stores/    Pinia stores\n│  ├─ composables/ reusable logic\n│  └─ locales/   vi.json / en.json\n├─ server/       Express.js backend\n│  ├─ controllers/\n│  ├─ services/\n│  ├─ models/\n│  ├─ routes/\n│  └─ socket.js\n├─ docker-compose.yml\n├─ nginx.conf\n├─ README.md\n├─ SRS.md\n└─ PROJECT_ANALYSIS.md",
          { style: { ...base.mono, fontSize: 21, color: C.navy } },
        ),
      ),
      column({ width: fill, height: fill, gap: 18, justify: "center" }, [
        callout("Client", "`pages`, `components`, `stores`, `composables`, `services` phục vụ trải nghiệm người dùng.", C.sage),
        callout("Server", "`routes`, `controllers`, `services`, `models` giữ business logic rõ lớp.", C.gold),
        callout("Hạ tầng", "Docker Compose và Nginx giúp chạy local/production-like dễ trình bày demo.", C.coral),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 11,
  kicker: "Frontend",
  title: "Các màn hình chính bao phủ cả customer và admin",
  accent: C.sage,
  notes: notes.arch,
  body: [
    twoTrack(
      "Customer pages",
      [
        "Homepage, featured products, new arrivals",
        "Shop, search, filter, category, brand",
        "Product detail, gallery, variant, review",
        "Cart, checkout, coupon, payment",
        "Account, address, wishlist, order history",
        "Blog, contact, FAQ, policy pages",
      ],
      "Admin pages",
      [
        "Dashboard thống kê",
        "Products CRUD và variants",
        "Orders detail, print, status",
        "Users, coupons, reviews",
        "Banners, blogs, popups, page content",
        "AI config, chat, notification, settings",
      ],
      C.sage,
      C.wine,
    ),
  ],
});

addStandardSlide({
  slideNo: 12,
  kicker: "Frontend",
  title: "Kiến trúc client Nuxt 3",
  accent: C.gold,
  notes: notes.arch,
  body: [
    column({ width: fill, height: fill, gap: 34, justify: "center" }, [
      row({ width: fill, height: hug, gap: 14, align: "center", justify: "center" }, [
        nodeBox("Nuxt pages", "file-based routing", C.gold, 230),
        arrow(),
        nodeBox("Vue components", "UI composition", C.sage, 250),
        arrow(),
        nodeBox("Composables", "reusable logic", C.blue, 230),
        arrow(),
        nodeBox("API services", "useApi / service layer", C.wine, 260),
      ]),
      row({ width: fill, height: hug, gap: 18, align: "center", justify: "center" }, [
        tag("Pinia stores: auth, cart, product, user, notification", C.sage, { fill: C.mint, fontSize: 20 }),
        tag("Middleware: auth / admin / guest", C.coral, { fill: C.rose, fontSize: 20 }),
        tag("i18n: vi / en", C.blue, { fill: "#E5F4FA", fontSize: 20 }),
      ]),
      T("Client giữ UI và state ở frontend, nhưng nghiệp vụ chính đi qua API để đồng bộ với backend.", {
        style: { fontSize: 27, color: C.muted, alignment: "center" },
      }),
    ]),
  ],
});

addStandardSlide({
  slideNo: 13,
  kicker: "Backend",
  title: "Backend theo MVC kết hợp Service Layer",
  accent: C.blue,
  notes: notes.arch,
  body: [
    column({ width: fill, height: fill, gap: 34, justify: "center" }, [
      row({ width: fill, height: hug, gap: 12, align: "center", justify: "center" }, [
        nodeBox("Request", "HTTP / JSON", C.gold, 175, 100),
        arrow(C.blue),
        nodeBox("Routes", "endpoint map", C.sage, 185, 100),
        arrow(C.blue),
        nodeBox("Middleware", "auth, admin, validate", C.coral, 225, 100),
        arrow(C.blue),
        nodeBox("Controller", "request / response", C.blue, 220, 100),
        arrow(C.blue),
        nodeBox("Service", "business logic", C.wine, 200, 100),
        arrow(C.blue),
        nodeBox("Model", "Sequelize", C.navy, 180, 100),
      ]),
      grid({ width: fill, height: hug, columns: [fr(1), fr(1), fr(1)], columnGap: 24 }, [
        compactCard("Dễ đọc", "HTTP layer không trộn trực tiếp với business logic.", C.sage),
        compactCard("Dễ mở rộng", "Service có thể gọi payment, AI, email mà controller vẫn gọn.", C.gold),
        compactCard("Dễ kiểm soát", "Middleware tập trung auth, role, validate, upload và error.", C.coral),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 14,
  kicker: "API",
  title: "Các nhóm endpoint chính phục vụ hành trình mua hàng",
  accent: C.wine,
  notes: notes.arch,
  body: [
    simpleTable({
      columns: [fr(0.75), fr(1.25), fr(1.55)],
      headers: ["Module", "Endpoint nhóm", "Chức năng"],
      fontSize: 17,
      rows: [
        ["Auth", "/api/v1/auth/*", "Register, OTP, login, OAuth, profile, forgot/reset password"],
        ["Products", "/api/v1/products/*", "List, detail, featured, new arrivals, sale, related, review"],
        ["Orders / Payments", "/api/v1/orders/* + /payments/*", "Tạo đơn, kiểm tra tồn kho, VNPay, MoMo, PayPal callback/webhook"],
        ["Customer utility", "/wishlist, /coupons, /settings", "Wishlist, validate coupon, public settings, product attributes"],
        ["Chat / AI", "/api/v1/chat/*", "AI chat, greeting, health, history, appearance, voice token"],
        ["Admin / Content", "/api/v1/admin/* + blogs/banners/popups/page-content", "Dashboard, CRUD vận hành, marketing content và settings"],
      ],
    }),
  ],
});

addStandardSlide({
  slideNo: 15,
  kicker: "Database",
  title: "Database được tổ chức theo các vùng nghiệp vụ",
  accent: C.sage,
  notes: notes.db,
  body: [
    column({ width: fill, height: fill, justify: "center" }, [
      grid({ width: fill, height: hug, columns: [fr(1), fr(1), fr(1)], rowGap: 18, columnGap: 20, alignItems: "start" }, [
        compactCard("Người dùng", "`users`, `addresses`, `notifications`", C.sage, { bodySize: 21 }),
        compactCard("Sản phẩm", "`products`, `variants`, `reviews`, `wishlists`", C.gold, { bodySize: 21 }),
        compactCard("Đơn hàng", "`orders`, `order_items`", C.coral, { bodySize: 21 }),
        compactCard("Khuyến mãi", "`coupons`, `coupon_usages`, `coupon_assignments`", C.blue, { bodySize: 21 }),
        compactCard("AI / chat", "`system_prompts`, `chat_logs`, `chat_sessions`", C.wine, { bodySize: 21 }),
        compactCard("Nội dung", "`banners`, `blogs`, `popups`, `page_contents`, `site_settings`", C.navy, { bodySize: 21 }),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 16,
  kicker: "Database",
  title: "ERD rút gọn: product - variant - order là lõi của resale",
  accent: C.gold,
  notes: notes.db,
  body: [
    column({ width: fill, height: fill, gap: 28, justify: "center" }, [
      row({ width: fill, height: hug, gap: 14, align: "center", justify: "center" }, [
        nodeBox("USERS", "orders, addresses, wishlist, reviews, chat logs", C.sage, 290, 120),
        arrow(C.gold),
        nodeBox("ORDERS", "status, payment, shipping snapshot", C.coral, 280, 120),
        arrow(C.gold),
        nodeBox("ORDER_ITEMS", "product snapshot + variant id", C.wine, 300, 120),
      ]),
      row({ width: fill, height: hug, gap: 14, align: "center", justify: "center" }, [
        nodeBox("PRODUCTS", "name, brand, category, price, images", C.gold, 300, 120),
        arrow(C.sage),
        nodeBox("VARIANTS", "SKU, size, color, material, status, stock", C.blue, 310, 120),
        arrow(C.sage),
        nodeBox("REVIEWS / WISHLISTS", "social proof + saved items", C.sage, 310, 120),
      ]),
      T("Điểm thiết kế quan trọng: `variants` đại diện cho từng item vật lý; `order_items` lưu snapshot để lịch sử đơn không bị đổi khi catalog thay đổi.", {
        style: { fontSize: 27, bold: true, color: C.ink, alignment: "center", lineSpacing: 1.2 },
      }),
    ]),
  ],
});

addStandardSlide({
  slideNo: 17,
  kicker: "Customer",
  title: "Module khách hàng đi từ tài khoản đến hậu mãi",
  accent: C.coral,
  notes: notes.admin,
  body: [
    column({ width: fill, height: fill, gap: 30, justify: "center" }, [
      row({ width: fill, height: hug, gap: 10, align: "center", justify: "center" }, [
        nodeBox("Auth", "Register, OTP, OAuth, reset", C.sage, 210, 104),
        arrow(C.coral),
        nodeBox("Browse", "Shop, search, filter", C.gold, 210, 104),
        arrow(C.coral),
        nodeBox("Product detail", "Gallery, variant, review", C.blue, 230, 104),
        arrow(C.coral),
        nodeBox("Cart / Checkout", "Coupon, shipping, payment", C.wine, 240, 104),
        arrow(C.coral),
        nodeBox("Post-purchase", "Order history, review", C.navy, 230, 104),
      ]),
      grid({ width: fill, height: hug, columns: [fr(1), fr(1), fr(1)], columnGap: 24 }, [
        compactCard("Khám phá", "Featured, new arrivals, category, brand, recently viewed.", C.gold),
        compactCard("Lưu giữ", "Wishlist, compare, address book và profile.", C.sage),
        compactCard("Tương tác", "Review đủ điều kiện và AI Stylist hỗ trợ tư vấn.", C.coral),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 18,
  kicker: "Admin",
  title: "Admin dashboard là trung tâm vận hành",
  accent: C.sage,
  notes: notes.admin,
  body: [
    grid({ width: fill, height: fill, columns: [fr(0.85), fr(1.15)], columnGap: 42 }, [
      column({ width: fill, height: fill, gap: 22, justify: "center" }, [
        T("Một nơi để quản trị toàn bộ vòng đời sản phẩm và trải nghiệm khách.", {
          style: { fontSize: 42, bold: true, color: C.ink, lineSpacing: 1.12 },
        }),
        row({ width: fill, height: hug, gap: 12 }, [
          tag("Catalog", C.gold),
          tag("Order", C.coral),
          tag("Content", C.sage),
          tag("AI", C.wine),
        ]),
      ]),
      grid({ width: fill, height: fill, columns: [fr(1), fr(1)], rowGap: 18, columnGap: 18 }, [
        compactCard("Dashboard", "Tổng quan, doanh thu tháng, đơn hàng gần đây, thông báo.", C.sage),
        compactCard("Commerce", "CRUD sản phẩm, variant, order status, user, coupon, review.", C.gold),
        compactCard("Content", "Banner, blog, popup, page builder, SEO và site settings.", C.blue),
        compactCard("AI & chat", "System prompt, appearance, voice config, pause AI, admin join chat.", C.coral),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 19,
  kicker: "AI Stylist",
  title: "AI chat tư vấn dựa trên dữ liệu sản phẩm thật",
  accent: C.gold,
  notes: notes.ai,
  body: [
    column({ width: fill, height: fill, gap: 30, justify: "center" }, [
      row({ width: fill, height: hug, gap: 10, align: "center", justify: "center" }, [
        nodeBox("User message", "Nhu cầu / size / budget", C.sage, 220, 104),
        arrow(C.gold),
        nodeBox("Chat API", "POST /api/v1/chat", C.blue, 210, 104),
        arrow(C.gold),
        nodeBox("Stylist Engine", "intent + entity", C.wine, 230, 104),
        arrow(C.gold),
        nodeBox("Product search", "database context", C.coral, 230, 104),
        arrow(C.gold),
        nodeBox("AI response", "Gemini/OpenAI/fallback", C.gold, 250, 104),
      ]),
      grid({ width: fill, height: hug, columns: [fr(1), fr(1), fr(1)], columnGap: 24 }, [
        compactCard("Có session memory", "Giữ ngữ cảnh hội thoại theo chat session.", C.sage),
        compactCard("Không bịa catalog", "Chỉ giới thiệu sản phẩm có trong context data.", C.gold),
        compactCard("Admin can thiệp được", "Pause AI, join chat, gửi tin nhắn và theo dõi lịch sử.", C.coral),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 20,
  kicker: "AI Voice",
  title: "Voice assistant và Live2D tạo điểm demo khác biệt",
  accent: C.coral,
  notes: notes.ai,
  body: [
    grid({ width: fill, height: fill, columns: [fr(0.7), fr(1.3)], columnGap: 44 }, [
      panel(
        { width: fill, height: fill, fill: C.mint, line: line(C.sage, 1), borderRadius: "rounded-lg", padding: { x: 36, y: 34 } },
        column({ width: fill, height: fill, gap: 24, align: "center", justify: "center" }, [
          image({ path: mascotPath, width: fixed(245), height: fixed(245), fit: "cover", borderRadius: "rounded-full", alt: "AURA Live2D mascot icon" }),
          T("Live2D Mascot", { style: { fontSize: 31, bold: true, color: C.ink, alignment: "center" } }),
          T("Nhân vật AI tư vấn xuất hiện như một trợ lý thời trang trong giao diện.", {
            style: { fontSize: 21, color: C.muted, lineSpacing: 1.2, alignment: "center" },
          }),
        ]),
      ),
      column({ width: fill, height: fill, gap: 18, justify: "center" }, [
        callout("Voice token/config", "`/api/v1/chat/voice-token` cung cấp model, voice name, temperature và prompt.", C.sage),
        callout("Transcript sync", "`/api/v1/chat/voice-sync` đồng bộ transcript voice về backend.", C.gold),
        callout("Tool call", "`/api/v1/chat/voice-tool-call` để voice assistant liên kết hành động.", C.coral),
        callout("Admin preview", "`/api/v1/admin/voice-preview` hỗ trợ nghe thử giọng nói trong admin.", C.blue),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 21,
  kicker: "Checkout",
  title: "Thanh toán nối order, inventory và payment gateway",
  accent: C.blue,
  notes: notes.arch,
  body: [
    column({ width: fill, height: fill, gap: 28, justify: "center" }, [
      row({ width: fill, height: hug, gap: 10, align: "center", justify: "center" }, [
        nodeBox("Customer", "xác nhận cart + địa chỉ", C.sage, 205, 104),
        arrow(C.blue),
        nodeBox("Nuxt Client", "POST /orders", C.gold, 205, 104),
        arrow(C.blue),
        nodeBox("Express API", "kiểm tra tồn kho", C.wine, 220, 104),
        arrow(C.blue),
        nodeBox("PostgreSQL", "order + order_items", C.coral, 225, 104),
        arrow(C.blue),
        nodeBox("Gateway", "VNPay / MoMo / PayPal", C.blue, 255, 104),
      ]),
      grid({ width: fill, height: hug, columns: [fr(1), fr(1), fr(1)], columnGap: 22 }, [
        compactCard("Tạo đơn trước", "Order và order_items được ghi sau khi kiểm tra khả dụng.", C.sage),
        compactCard("Redirect / callback", "Gateway trả return, IPN hoặc webhook về backend.", C.gold),
        compactCard("Cấu hình bật/tắt", "`site_settings` điều khiển payment methods được hiển thị.", C.coral),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 22,
  kicker: "Security",
  title: "Bảo mật được đặt ở cả backend và frontend",
  accent: C.wine,
  notes: notes.arch,
  body: [
    twoTrack(
      "Backend controls",
      [
        "Helmet security headers",
        "CORS whitelist theo environment",
        "Rate limit chung cho /api",
        "Rate limit riêng cho auth",
        "JWT middleware protect",
        "adminOnly cho admin routes",
        "express-validator, bcryptjs, multer",
        "notFound và errorHandler",
      ],
      "Frontend controls",
      [
        "Route middleware auth.ts",
        "Route middleware admin.ts",
        "Route middleware guest.ts",
        "Auth token/state qua Pinia/composable",
        "UI phân vai customer/admin",
        "API client layer gom logic gọi backend",
      ],
      C.wine,
      C.sage,
    ),
  ],
});

addStandardSlide({
  slideNo: 23,
  kicker: "UI / i18n",
  title: "Giao diện luxury sáng, song ngữ Việt / Anh",
  accent: C.gold,
  notes: notes.arch,
  body: [
    grid({ width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 44 }, [
      column({ width: fill, height: fill, gap: 22, justify: "center" }, [
        callout("i18n", "Hỗ trợ `vi` và `en`, mặc định tiếng Việt, locale files lazy-loaded.", C.sage),
        callout("Typography", "Serif cho tiêu đề lớn, sans-serif cho nội dung, ưu tiên khoảng trắng và ảnh sản phẩm.", C.gold),
        callout("Design direction", "Luxury, tối giản, cao cấp, tập trung vào trải nghiệm mua hàng và AI chat.", C.coral),
      ]),
      column({ width: fill, height: fill, gap: 22, justify: "center" }, [
        T("Bảng màu sản phẩm", { style: { fontSize: 30, bold: true, color: C.ink } }),
        grid({ width: fill, height: hug, columns: [fr(1), fr(1), fr(1)], rowGap: 18, columnGap: 18 }, [
          compactCard("Black", "#0A0A0A", C.ink, { fill: "#F7F7F4" }),
          compactCard("Cream", "#FAF9F6", C.gold, { fill: "#FFFDF8" }),
          compactCard("Gold", "#D4AF37", C.gold, { fill: "#FFF8DD" }),
          compactCard("Burgundy", "#722F37", C.wine, { fill: "#F7E7EA" }),
          compactCard("Navy", "#041E42", C.navy, { fill: "#EAF2F8" }),
          compactCard("White", "#FFFFFF", C.sage, { fill: C.white }),
        ]),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 24,
  kicker: "Triển khai",
  title: "Docker Compose gom các service cần chạy demo",
  accent: C.sage,
  notes: notes.arch,
  body: [
    grid({ width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 40 }, [
      grid({ width: fill, height: fill, columns: [fr(1), fr(1)], rowGap: 18, columnGap: 18 }, [
        compactCard("postgres", "PostgreSQL 15 Alpine\nport 5432", C.sage, { bodySize: 20 }),
        compactCard("server", "Node.js API production\nexpose 5000", C.blue, { bodySize: 20 }),
        compactCard("client", "Nuxt production\nexpose 3000", C.gold, { bodySize: 20 }),
        compactCard("nginx", "reverse proxy\npublic port 80", C.coral, { bodySize: 20 }),
        compactCard("server-dev", "hot reload backend\nport 5000", C.wine, { bodySize: 20 }),
        compactCard("client-dev", "hot reload frontend\nport 3000", C.navy, { bodySize: 20 }),
      ]),
      column({ width: fill, height: fill, gap: 18, justify: "center" }, [
        callout("Nginx route", "`/api`, `/uploads`, `/socket.io/` proxy về backend; route còn lại về Nuxt client.", C.gold),
        callout("Local URLs", "Client `localhost:3000`, server API `localhost:5000/api/v1`, health `/health`.", C.sage),
        callout("API docs", "Swagger UI/OpenAPI có thể bật qua `API_DOCS_MODE`.", C.blue),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 25,
  kicker: "Demo",
  title: "Demo flow nên kể theo hai tuyến: customer và admin",
  accent: C.coral,
  notes: notes.admin,
  body: [
    twoTrack(
      "Customer demo",
      [
        "1. Homepage và song ngữ",
        "2. Shop, filter theo category/brand",
        "3. Product detail, ảnh, variant, review",
        "4. Cart, coupon, checkout",
        "5. Payment success/failure",
        "6. AI Stylist hỏi gợi ý sản phẩm",
      ],
      "Admin demo",
      [
        "1. Đăng nhập admin",
        "2. Dashboard tổng quan",
        "3. Tạo/cập nhật product và variant",
        "4. Cập nhật trạng thái order",
        "5. Quản lý coupon/review/banner/popup",
        "6. AI config/chats, pause AI và join chat",
      ],
      C.sage,
      C.wine,
    ),
  ],
});

addStandardSlide({
  slideNo: 26,
  kicker: "Kết quả",
  title: "Kết quả đạt được nằm ở cả kỹ thuật và nghiệp vụ",
  accent: C.gold,
  notes: notes.end,
  body: [
    grid({ width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 42 }, [
      column({ width: fill, height: fill, gap: 18, justify: "center" }, [
        T("Kỹ thuật", { style: { fontSize: 34, bold: true, color: C.ink } }),
        callout("Full-stack rõ ràng", "Client/server/database đã tách trách nhiệm.", C.sage),
        callout("API có phân lớp", "Route - controller - service - model dễ bảo trì.", C.blue),
        callout("AI + realtime", "AI chat/voice và Socket.IO phục vụ tư vấn.", C.coral),
        callout("Deploy được", "Docker Compose và Nginx cho môi trường production-like.", C.gold),
      ]),
      column({ width: fill, height: fill, gap: 18, justify: "center" }, [
        T("Nghiệp vụ", { style: { fontSize: 34, bold: true, color: C.ink } }),
        callout("Hành trình mua hàng", "Từ khám phá sản phẩm đến checkout và order history.", C.sage),
        callout("Vận hành admin", "Quản lý nội dung, catalog, đơn hàng, khách hàng và coupon.", C.gold),
        callout("Cá nhân hóa", "AI Stylist làm tăng chiều sâu trải nghiệm luxury fashion.", C.coral),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 27,
  kicker: "Điểm mạnh",
  title: "Điểm mạnh của đề tài",
  accent: C.sage,
  notes: notes.end,
  body: [
    column({ width: fill, height: fill, justify: "center" }, [
      grid({ width: fill, height: hug, columns: [fr(1), fr(1), fr(1)], rowGap: 20, columnGap: 20, alignItems: "start" }, [
        compactCard("Phạm vi thực tế", "Gần với một hệ thống e-commerce vận hành thật.", C.sage),
        compactCard("Resale-aware", "Variant có SKU, status, stock và tình trạng riêng.", C.gold),
        compactCard("Backend mở rộng", "Service layer giúp business logic rõ ràng.", C.blue),
        compactCard("Admin rộng", "Quản lý sản phẩm, đơn hàng, content, coupon và AI.", C.coral),
        compactCard("AI có ràng buộc", "Tư vấn dựa trên dữ liệu sản phẩm trong database.", C.wine),
        compactCard("Đa phương thức", "VNPay, MoMo, PayPal, i18n Việt/Anh, Docker/Nginx.", C.navy),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 28,
  kicker: "Hạn chế",
  title: "Hạn chế hiện tại cần nhìn nhận rõ",
  accent: C.wine,
  notes: notes.end,
  body: [
    grid({ width: fill, height: fill, columns: [fr(1.05), fr(0.95)], columnGap: 42 }, [
      column({ width: fill, height: fill, gap: 18, justify: "center" }, [
        callout("Chưa có mobile app native", "Phiên bản hiện tại tập trung vào web/PWA-level experience.", C.coral),
        callout("Inventory chưa đa kho", "Chưa xử lý phức tạp nhiều chi nhánh, transfer hoặc stock audit.", C.gold),
        callout("Test automation chưa nổi bật", "Repo cần bổ sung bộ unit/integration/e2e rõ hơn.", C.sage),
      ]),
      column({ width: fill, height: fill, gap: 18, justify: "center" }, [
        callout("Production cần hoàn thiện", "Monitoring, backup, log aggregation và secret management còn là hướng tiếp tục.", C.blue),
        callout("Webhook payment cần kiểm thử sâu", "IPN/webhook cần verify kỹ khi chạy production thật.", C.wine),
        callout("Artifact cũ cần rà soát", "Chỉ tái sử dụng tài liệu/scaffold cũ khi khớp kiến trúc hiện tại.", C.navy),
      ]),
    ]),
  ],
});

addStandardSlide({
  slideNo: 29,
  kicker: "Roadmap",
  title: "Hướng phát triển tiếp theo",
  accent: C.blue,
  notes: notes.end,
  body: [
    column({ width: fill, height: fill, gap: 24, justify: "center" }, [
      row({ width: fill, height: hug, gap: 16, align: "center", justify: "center" }, [
        nodeBox("1. Experience", "Mobile/PWA nâng cao\nRecommendation engine", C.sage, 270, 130),
        arrow(C.blue),
        nodeBox("2. Trust layer", "Authentication record\nCertificate cho hàng luxury", C.gold, 300, 130),
        arrow(C.blue),
        nodeBox("3. Marketplace", "Seller portal\nConsignment intake", C.coral, 270, 130),
        arrow(C.blue),
        nodeBox("4. Operations", "Analytics, tests, CI/CD\nMonitoring + backup", C.wine, 300, 130),
      ]),
      T("Nâng cấp AI thành RAG có thể truy vấn catalog, policy, order history và customer profile để tư vấn sát hơn.", {
        style: { fontSize: 30, bold: true, color: C.ink, alignment: "center", lineSpacing: 1.2 },
      }),
    ]),
  ],
});

addStandardSlide({
  slideNo: 30,
  kicker: "Kết luận",
  title: "AURA ARCHIVE chứng minh một sản phẩm full-stack có tính ứng dụng",
  accent: C.sage,
  notes: notes.end,
  body: [
    grid({ width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 46 }, [
      column({ width: fill, height: fill, gap: 22, justify: "center" }, [
        T("Từ frontend, backend, database, realtime, payment đến AI, dự án đã gom đủ các thành phần cốt lõi của một nền tảng luxury resale e-commerce.", {
          style: { fontSize: 42, bold: true, color: C.ink, lineSpacing: 1.12 },
        }),
      ]),
      column({ width: fill, height: fill, gap: 20, justify: "center" }, [
        callout("Có sản phẩm demo rõ ràng", "Người xem có thể đi theo flow customer và admin.", C.sage),
        callout("Có kiến trúc mở rộng được", "Client/server/database/service layer giúp phát triển tiếp.", C.gold),
        callout("Có hướng thị trường phù hợp", "Luxury resale, AI stylist, seller portal và trust layer đều có đất mở rộng.", C.coral),
      ]),
    ]),
  ],
});

const pendingImages = presentation.getPendingImageHydrationRequests();
if (pendingImages.length > 0) {
  const hydratedImages = await Promise.all(
    pendingImages.map(async (req) => ({
      assetId: req.assetId,
      contentType: req.contentType,
      data: await fs.readFile(req.uri),
    })),
  );
  presentation.hydrateImageAssets(hydratedImages);
}

const pptxBlob = await PresentationFile.exportPptx(presentation);
await pptxBlob.save(PPTX);

const rendered = [];
const slideCount = presentation.slides.items.length;
for (let i = 0; i < slideCount; i += 1) {
  const slide = presentation.slides.items[i];
  const blob = await slide.export();
  const file = path.join(PREVIEWS, `slide-${String(i + 1).padStart(2, "0")}.png`);
  await fs.writeFile(file, Buffer.from(await blob.arrayBuffer()));
  rendered.push(file);
}

const inspect = await presentation.inspect({
  kind: "slide,textbox,image,shape",
  include: "bbox,text,textLines,textPreview",
  maxChars: 180000,
});

const entries = inspect.ndjson
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const offSlide = entries.filter((e) => {
  if (!Array.isArray(e.bbox)) return false;
  const [x, y, w, h] = e.bbox;
  return x < -1 || y < -1 || x + w > W + 1 || y + h > H + 1;
});

const artifactRequire = createRequire(await import.meta.resolve("@oai/artifact-tool"));
const { Canvas, loadImage } = artifactRequire("skia-canvas");

async function imageStats(file) {
  const img = await loadImage(file);
  const canvas = new Canvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  let min = 255;
  let max = 0;
  let coloredSamples = 0;
  let samples = 0;
  const stepX = Math.max(1, Math.floor(img.width / 80));
  const stepY = Math.max(1, Math.floor(img.height / 45));
  for (let y = 0; y < img.height; y += stepY) {
    for (let x = 0; x < img.width; x += stepX) {
      const idx = (y * img.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      min = Math.min(min, r, g, b);
      max = Math.max(max, r, g, b);
      if (Math.abs(r - 255) + Math.abs(g - 253) + Math.abs(b - 248) > 18) coloredSamples += 1;
      samples += 1;
    }
  }
  return {
    file,
    width: img.width,
    height: img.height,
    contrastRange: max - min,
    coloredSampleRatio: Number((coloredSamples / samples).toFixed(3)),
    nonBlank: max - min > 20 && coloredSamples / samples > 0.015,
  };
}

const stats = [];
for (const file of rendered) stats.push(await imageStats(file));

const thumbW = 320;
const thumbH = 180;
const cols = 5;
const rows = Math.ceil(rendered.length / cols);
const montage = new Canvas(cols * thumbW, rows * (thumbH + 34));
const mctx = montage.getContext("2d");
mctx.fillStyle = "#FFFDF8";
mctx.fillRect(0, 0, montage.width, montage.height);
mctx.font = "18px Arial";
mctx.fillStyle = "#25384A";
for (let i = 0; i < rendered.length; i += 1) {
  const img = await loadImage(rendered[i]);
  const x = (i % cols) * thumbW;
  const y = Math.floor(i / cols) * (thumbH + 34);
  mctx.drawImage(img, x, y, thumbW, thumbH);
  mctx.fillStyle = "#25384A";
  mctx.fillText(`Slide ${String(i + 1).padStart(2, "0")}`, x + 10, y + thumbH + 24);
}
await fs.writeFile(MONTAGE, await montage.toBuffer("png"));

await fs.writeFile(
  REPORT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      pptx: PPTX,
      slideCount,
      previews: rendered,
      montage: MONTAGE,
      textObjectCount: entries.filter((e) => e.kind === "textbox").length,
      offSlideObjectCount: offSlide.length,
      offSlide,
      imageStats: stats,
      allPreviewsNonBlank: stats.every((s) => s.nonBlank),
    },
    null,
    2,
  ),
  "utf8",
);

console.log(
  JSON.stringify(
    {
      pptx: PPTX,
      slideCount,
      previewsDir: PREVIEWS,
      montage: MONTAGE,
      report: REPORT,
      offSlideObjectCount: offSlide.length,
      allPreviewsNonBlank: stats.every((s) => s.nonBlank),
    },
    null,
    2,
  ),
);
