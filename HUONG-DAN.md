# Văn Phòng & Thế Giới Trốn Việc – hướng dẫn deploy

Kiến trúc: **Vercel** phục vụ giao diện (thư mục `public/`) + **Render** chạy server realtime (thư mục `server/`).
(Vercel không giữ được kết nối WebSocket nên phần realtime phải chạy ở chỗ khác.)

## 0. Chạy thử trên máy

### Cách 1: Chạy nhanh bằng 1 click (Khuyến nghị trên Windows)
- Nhấp đúp chuột vào file `run-local.bat`: Tự động build CSS, chạy ngầm WebSocket Server (:8080) và Web Static (:8000), ghi logs vào thư mục `logs/` và tự động mở 2 tab trình duyệt để chơi.
- Khi chơi xong, nhấp đúp vào `stop-local.bat` để tắt toàn bộ server và giải phóng cổng.

### Cách 2: Chạy thủ công trên terminal
    npm install
    npm run build                 # tạo public/styles.css (Tailwind)
    cd server && npm install && npm start     # terminal 1: server ws://localhost:8080
    npx serve public -l 8000                  # terminal 2: mở http://localhost:8000
Mở 2 tab trình duyệt để thử 2 người chơi.

## 1. Đưa code lên GitHub
    git init && git add . && git commit -m "game" && git branch -M main
    git remote add origin https://github.com/<ten-ban>/van-phong-game.git
    git push -u origin main

## 2. Deploy server realtime lên Render
Render > New + > Web Service > chọn repo.
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Instance Type: Free
Xong sẽ có địa chỉ `https://van-phong-game.onrender.com`  ->  WebSocket là `wss://van-phong-game.onrender.com`
Kiểm tra: mở địa chỉ https đó, thấy chữ `ok - players: 0` là chạy.

## 3. Điền địa chỉ server vào game
Sửa `public/config.js`:
    window.GAME_CONFIG = { WS_URL: "wss://van-phong-game.onrender.com" };
rồi `git add . && git commit -m "ws url" && git push`

## 4. Deploy giao diện lên Vercel
Vercel > Add New > Project > import repo. File `vercel.json` đã cấu hình sẵn
(Build `npm run build`, Output `public`). Bấm Deploy.

## 5. Khóa server chỉ nhận game của bạn (khuyến nghị)
Render > service > Environment > thêm biến:
    ALLOWED_ORIGINS = https://<ten-du-an>.vercel.app
(nhiều địa chỉ thì ngăn cách bằng dấu phẩy, không có dấu `/` ở cuối). Render sẽ tự deploy lại.

## 6. Chơi
Gửi link Vercel cho mọi người. Mỗi người chọn 1 nhân vật + đặt tên. Nhân vật chưa ai chọn là NPC tự đi dạo.

## 7. Trải nghiệm trên Điện Thoại (Mobile Responsive & Cảm Ứng Đa Điểm)
- **Cùng mạng Wi-Fi**: Mở trình duyệt điện thoại và truy cập `http://<IP-Wi-Fi>:8000` (được file `run-local.bat` tự động phát hiện và in ra).
- **Thanh Topbar tối giản 1 hàng, không cuộn ngang**:
  - Ẩn tên khu vực trên điện thoại (chỉ hiển thị trên máy tính `md:flex`).
  - Ẩn thời gian phạt trên thanh Topbar (đã có đồng hồ đếm ngược to rõ ngay trên đầu nhân vật khi bị phạt).
  - Số người online hiển thị siêu gọn `🟢 x/10` (ví dụ `🟢 1/10`).
  - Ẩn danh sách chọn 9 khu vực tự di chuyển trên điện thoại.
  - Nút **🎬 Nhập link trình chiếu** nằm gọn gàng trên thanh Topbar (ngay cạnh nút Bản đồ `🗺️` và Chat `💬`), chạm vào sẽ mở hộp thoại để dán link YouTube / `.mp4` hoặc chọn nhanh kênh có sẵn.
  - Nút **⛶ Toàn Màn Hình** nằm gọn gàng ở góc trên bên phải thanh Topbar (ngay cạnh nút thu gọn `▲`).
  - Toàn bộ thanh Header vừa khít trên 1 dòng đơn phẳng, hoàn toàn không cần cuộn ngang trên mọi dòng điện thoại.
- **Hỗ trợ cảm ứng đa điểm đồng thời (Multi-Touch)**: Tay trái vừa giữ rê joystick di chuyển nhân vật, tay phải vừa có thể bấm liên tục phím **`[🧱 Ném Gạch]`** hoặc các nút skill/chuyến đi đặc biệt với độ trễ 0ms, không bị nuốt phím hay khựng joystick.
- **Góc nhìn Camera xa rộng (Zoom-out 60%)**: Mặc định thu nhỏ góc nhìn 60% trên điện thoại giúp bạn bao quát trọn khu vực phòng và các lối mòn xung quanh. Hỗ trợ thao tác **chụm/mở 2 ngón tay (Pinch to Zoom)** và cụm nút **`🔍-` / `🔍+`** ở giữa đáy màn hình để phóng to / thu nhỏ tự do.
- **Giao diện thoáng sạch 100%**:
  - Ẩn hoàn toàn thanh điều khiển máy chiếu nổi trên đỉnh màn hình (vẫn phát video trong phòng họp bình thường và chỉnh qua nút Máy Chiếu trong menu).
  - Ẩn bảng hướng dẫn di chuyển dài dòng ở góc trái, chỉ hiện huy hiệu nhỏ khi đứng sát đồng nghiệp (`🎯 Đủ gần dùng skill`).
  - Tên trên đầu nhân vật hiển thị trực tiếp tên người chơi đặt (đã loại bỏ tiền tố `#xx`).
- **Tự động ẩn cụm nút Skill & Emoji khi xem Bản đồ**: Khi chạm nút `🗺️ Bản đồ` trên điện thoại để mở Minimap quan sát vị trí Gạch và Sếp, cụm phím `[🎯 Skill]` và `[😊 Emoji]` sẽ tự động ẩn đi để nhường trọn không gian, đóng bản đồ lại sẽ tự động hiện lại như cũ.
- **Thu gọn Topbar (▲ / ⚙️ Menu ▼)**: Nhấn nút `▲` trên thanh Topbar để ẩn hẳn thanh điều khiển, canvas game sẽ chiếm trọn 100% diện tích màn hình. Khi cần chỉnh cài đặt, chạm vào viên thuốc `⚙️ Menu Điều Khiển ▼` ở mép trên.
- **Xoay ngang màn hình (Landscape)**: Tự động dàn trang thông minh:
  - Phòng thay đồ (Chọn nhân vật): Chia 2 cột trực quan (Cột trái: xem trước + đặt tên + nút Vào game; Cột phải: 10 nhân vật), thấy hết toàn bộ mà không cần cuộn trang.
  - Tự động né vùng tai thỏ / camera khoét (Safe-Area Insets).
- **Cần điều khiển ảo (Virtual Joystick)**: Góc dưới bên trái dạng mờ trong suốt (translucent), rê ngón tay cái để nhân vật di chuyển liên tục theo mọi hướng mượt mà, chạm vào sẽ sáng rõ.
- **Cụm thao tác ngón cái bên phải (2 Tab Tinh Gọn: Skill & Emoji)**:
  - `[🎯 Skill]`: Ném gạch hạ gục Boss (B), Gõ búa hơi (Space), Ném máy bay giấy (F), Kéo ghế (G), Nạp trà sữa (E).
  - `[😊 Emoji]`: 11 phím âm thanh meme hiệu ứng khoảng cách (Spatial Audio).
- **Khung Chat & Bản đồ nhỏ dạng ngăn kéo (Drawer)**:
  - Nút `🗺️` trên thanh topbar bật/tắt bản đồ nhỏ (có hiển thị vị trí các viên gạch `🧱`).
  - Nút `💬` trên thanh topbar mở khay chat dạng trượt từ cạnh phải, tự động hiển thị chấm đỏ nhấp nháy khi có tin nhắn hoặc thông báo Sếp bắt.

## 8. Chuyến Đi Đặc Biệt & Bục Loa Điều Khiển Âm Thanh Màn Chiếu
- **Bục Loa Điều Khiển Âm Thanh Màn Chiếu (ZONES.meeting)**:
  - Ở mép dưới khu vực trình chiếu (tọa độ `x: 1860, y: 820`) có đặt một **Bục điều khiển âm thanh DJ mixer kim loại & Dàn loa thùng sân khấu**.
  - Bàn điều khiển có đèn LED Equalizer nhấp nháy, loa phát sóng âm thanh và bảng trạng thái `🔊 LOA: ĐANG PHÁT TIẾNG` / `🔇 LOA: ĐANG TẮT TIẾNG`.
  - Khi nhân vật di chuyển lại gần bục điều khiển ($\le 95\text{px}$), nút bấm tương tác nổi bật sẽ hiện lên màn hình:
    - Nếu đang tắt tiếng: **`[🔊 BẬT TIẾNG MÀN CHIẾU]`** *(Chạm hoặc phím `Space` / `E` / `R`)*
    - Nếu đang có tiếng: **`[🔇 TẮT TIẾNG MÀN CHIẾU]`** *(Chạm hoặc phím `Space` / `E` / `R`)*
  - Nhấn nút để bật/tắt âm thanh video trình chiếu ngay tức thì kèm thông báo nổi.
- **Thảm Bay Ấn Độ Về Văn Phòng (ZONES.india)**:
  - Khi người chơi di chuyển đến gần tấm Thảm Bay Ba Tư bên phải đền Taj Mahal (Ấn Độ), nút tương tác nổi bật **`[🧞 LÊN THẢM BAY VỀ VĂN PHÒNG]`** sẽ hiện lên (nhấn phím `Space` / `R` hoặc chạm trên màn hình).
  - Thảm bay chở người chơi bay bổng hình vòng cung trên những đám mây, để lại vệt bụi sao ma thuật vàng óng ánh và đáp thẳng xuống giữa Khu Làm Việc Chính (Văn Phòng).
  - Trong suốt chuyến bay, người chơi được miễn nhiễm hoàn toàn với Sếp (cộng thêm 3 giây miễn nhiễm sau khi tiếp đất).
- **Đu Quay Nha Trang Lướt Siêu Tốc Sang Đà Lạt (ZONES.nhatrang -> ZONES.dalat)**:
  - Khi người chơi di chuyển vào Bánh xe Bầu trời VinWonders tại Nha Trang, nút tương tác **`[🎡 QUAY ĐU QUAY & LƯỚT ĐÀ LẠT]`** sẽ xuất hiện.
  - Giai đoạn 1: Người chơi bước vào cabin và quay trọn vẹn 1 vòng tròn $360^\circ$ trên Bánh xe Bầu trời rực rỡ pháo hoa lễ hội (~1.75 giây).
  - Giai đoạn 2: Bánh xe Bầu trời kích hoạt cú trượt siêu tốc, nhân vật lướt vèo với vệt gió neon xanh thần tốc sang Quảng trường Lâm Viên (Đà Lạt), đáp xuống ngay cạnh khối Hoa Dã Quỳ vàng và Nụ hoa Atiso xanh rực rỡ hoa anh đào!
  - Miễn nhiễm phạt trong suốt quá trình quay và lướt.

## 9. Cơ Chế Đại Chiến Sếp (Boss Raid) & Cây Phóng Lợn
- **Sếp Cầm Cây Phóng Lợn Đi Tuần**: Sếp NPC cưỡi chiếc xe máy Honda Cub trắng huyền thoại, tay cầm cây phóng lợn sáng loáng dài sắc bén với lưỡi phóng ánh bạc rượt đuổi nhân viên trốn việc.
- **Máu của BOSS (100 HP)**: Đã nâng cấp lên 100 HP, hiển thị thanh máu chi tiết trên thanh Topbar và ngay trên đầu của Boss khi di chuyển tuần tra.
- **Xuất hiện Gạch ngẫu nhiên**: Cứ mỗi 10 giây, máy chủ tự động làm rơi 1 cục gạch ngẫu nhiên ở 1 trong các khu vực trên bản đồ (có hiển thị chấm cam `🧱` trên Minimap).
- **Nhặt gạch**: Người chơi đi ngang qua viên gạch (khoảng cách $\le 60\text{px}$) sẽ tự động nhặt vào túi (tối đa 3 viên/người).
- **Ném gạch & Phóng Cây Thông vào BOSS**:
  - Vòng tròn radar quét phát hiện của BOSS: **300px**.
  - Phạm vi ném an toàn của người chơi: **470px** (lớn hơn vòng tròn bị Sếp bắt 300px).
  - Khi đã đủ cự ly an toàn (trong tầm 470px), nút **`[🧱 Ném Gạch]`** hoặc **`[🌲 Ném Cây Thông]`** sẽ **chớp nháy phát sáng** báo hiệu có thể ném ngay (nhấn phím `B` trên máy tính hoặc bấm nút ném trên điện thoại).
  - Mỗi viên gạch trúng đích làm Boss mất 1 HP. Mỗi cây thông trúng đích làm Boss mất 2 HP kèm hiệu ứng ném bay parabol và nổ tán lá thông.
- **Quỹ đạo di chuyển ngẫu nhiên, khó đoán của BOSS**:
  - Sếp không đi theo một vòng tròn lặp lại cứng nhắc mà điều hướng thông minh qua mạng lưới ngã rẽ giữa 9 khu vực.
  - Tại mỗi ngã rẽ, Sếp ngẫu nhiên chọn rẽ các nhánh khác nhau (có 25% cơ hội bất ngờ quay đầu xe).
  - Khi đến các khu vực, Sếp có 50% cơ hội lượn quanh chu vi khu vực theo quỹ đạo cong mềm mại trước khi rời đi.
  - Thay đổi tốc độ liên tục: có lúc rồ ga phóng nhanh (280-330 px/s), có lúc đi chậm rình mò (140-170 px/s).
  - Quỹ đạo xe luôn uốn lượn hình sin/parabol, không còn đi theo đường thẳng cứng nhắc.
- **Khu Vực Làm Việc Chính an toàn tuyệt đối 100%**:
  - Sếp vẫn có thể lái xe lượn vào văn phòng làm việc nhưng tính năng bắt phạt sẽ **TẮT HOÀN TOÀN** khi Sếp ở trong văn phòng (vòng radar chuyển sang màu xanh dương êm dịu, bảng tên đổi thành `🛵 BOSS (VĂN PHÒNG)`).
  - Nhân viên đứng trong văn phòng làm việc (kể cả đứng ở ngưỡng cửa ra vào) được bảo vệ tuyệt đối, không bao giờ bị Sếp bắt.
- **Tiêu diệt Boss & Kết cục Game Over**:
  - Khi Boss bị ném trúng đủ 100 HP, màn hình Game Over bùng nổ: **"💥 BOSS ĐÃ BỊ HẠ GỤC! 🏢 TẤT CẢ ĐÃ BỊ ĐUỔI VIỆC!"**.
  - Màn hình thông báo hiển thị cố định cùng nút bấm **`[🚪 QUAY LẠI MÀN HÌNH ĐĂNG NHẬP]`** (không tự động nhảy về sảnh), cho phép người chơi chủ động bấm nút để quay lại sảnh đăng nhập và chọn nhân vật cho trận chiến mới.
- **Giao diện chọn nhân vật tối giản**:
  - Thẻ nhân vật chỉ hiển thị số thứ tự (`#01` – `#10`), hình chibi xem trước và tên nhân vật (đã loại bỏ toàn bộ phần mô tả và vai trò dài dòng).
  - Nhân vật Sếp tuần tra được đổi tên ngắn gọn thành **BOSS**.

## 10. Tương Tác Đặc Biệt Tại 5 Khu Vực Bản Đồ (Tự Động Ẩn Nút Khi Đang Hồi Chiêu Trên Điện Thoại)
- **Cơ chế ẩn nút thông minh trên Điện thoại & Desktop**: Sau khi kích hoạt kỹ năng trong khu vực, nút bấm tương tác sẽ lập tức ẩn đi hoàn toàn để giữ màn hình thông thoáng. Chỉ khi nào kỹ năng kết thúc và thời gian hồi chiêu hoàn tất thì nút mới hiển thị lại nếu người chơi còn đứng trong khu vực.
- **1. Vườn Rau (ZONES.garden) – Nhấn phím `R` nạp đầy 3 viên gạch**:
  - Khi nhân vật bước vào khu vực Vườn Rau Nhà Kính, nút tương tác **`[🌱 NẠP ĐẦY GẠCH VƯỜN RAU]`** sẽ tự động hiện lên màn hình.
  - Người chơi bấm phím **`R`** (hoặc `Space` / chạm nút trên điện thoại) để lập tức thu hoạch nạp đầy đủ **3/3 viên gạch** vào túi.
  - Hồi chiêu 10 giây (nút tự ẩn đi trong suốt 10 giây hồi chiêu hoặc khi túi đã đầy 3 gạch).
- **2. SaPa (ZONES.sapa) – Tàng hình 5 giây & Miễn nhiễm Sếp**:
  - Khi người chơi di chuyển vào SaPa Săn Mây, nút tương tác **`[🌫️ TÀNG HÌNH TRỐN SẾP (SAPA)]`** sẽ xuất hiện.
  - Kích hoạt sẽ khiến nhân vật hòa mình vào sương mù SaPa:
    - Cơ thể hiển thị mờ ảo trong suốt (độ mờ `35%`) kèm vầng mây bồng bềnh dưới chân và huy hiệu `🌫️ TÀNG HÌNH` nổi trên đầu trong **5 giây**.
    - **Miễn nhiễm hoàn toàn với Sếp**: Sếp NPC có lái xe máy đi ngang qua cũng không thể phát hiện hay bắt phạt.
    - Đồng bộ hiển thị trạng thái tàng hình đến toàn bộ người chơi khác trên bản đồ.
    - Thời gian hồi chiêu 10 giây (nút tự ẩn đi trong suốt thời gian tàng hình và hồi chiêu).
- **3. Viện Bảo Tàng (ZONES.museum) – Vẽ bậy lên tranh Sếp 15 giây**:
  - Khi bước vào Viện Bảo Tàng bên cạnh bức chân dung mạ vàng khổng lồ ("Báo vật Cấp Quốc Gia"), nút tương tác **`[🎨 VẼ BẬY LÊN TRANH SẾP]`** sẽ xuất hiện.
  - Nhấn nút (hoặc phím `R`) để vẽ bậy lên bức tranh Sếp:
    - Bức tranh của Sếp lập tức được trang trí thêm: cặp kính râm đen cực ngầu, chiếc mũi hề tròn đỏ tinh nghịch, bộ ria mèo nguệch ngoạc màu hồng và dòng chữ xịt sơn graffiti neon nổi bật: `"SẾP ƠI LÀ SẾP! 😹"` kèm tên của người vẽ.
    - Hiệu ứng tồn tại trong **15 giây** và nút tự ẩn đi trong suốt thời gian tranh đang bị vẽ.
- **4. Phòng Karaoke (ZONES.karaoke) – Gọi vũ công Ấn Độ múa 10 giây, Nhân viên không bị bắt & Boss Đứng Im Mê Mẩn**:
  - Khi người chơi di chuyển vào Phòng Karaoke & Đại Tiệc Lẩu, nút tương tác **`[💃 GỌI VŨ CÔNG ẤN ĐỘ NHẢY MÚA]`** sẽ hiển thị.
  - Nhấn nút (hoặc phím `R`) sẽ triệu hồi **dàn 4 vũ công truyền thống Ấn Độ** (Priya, Ananya, Deepika, Kavita) xuất hiện xung quanh bàn tiệc lẩu dài:
    - Các vũ công mặc trang phục Sari truyền thống rực rỡ đính viền kim tuyến, trang sức vàng Maang Tikka trên trán, chấm đỏ Bindi và hoa cài tóc Gajra lắc hông nhún nhảy múa Mudra duyên dáng.
    - Tự động bật bản nhạc Ấn Độ sôi động trong **10 giây** (nút bấm tự ẩn đi trong suốt 10 giây này).
  - **Bảo vệ người chơi an toàn 100%**: Trong suốt 10 giây dàn vũ công nhảy múa, **người chơi ở trong phòng Karaoke tuyệt đối không bị Boss bắt phạt** (kể cả khi Boss đang ở ngoài cửa, đi ngang qua hay đi vào trong phòng).
  - **Hiệu ứng đặc biệt với Boss**:
    - Khi Boss di chuyển vào phòng Karaoke hoặc đang ở sẵn trong phòng Karaoke lúc có người bấm gọi vũ công: Boss lập tức **đứng im như tượng** ngắm nhìn say đắm trong suốt thời gian vũ công nhảy.
    - **Hai mắt của Boss biến thành hai hình trái tim `💖` lấp lánh (pulsing)**, đầu tỏa ra những hạt tim hồng bồng bềnh, bảng tên đổi thành `🛵 BOSS (MÊ MẨN VŨ CÔNG 😍)`, khói pô xe tắt hẳn.
    - Boss tạm ngưng hoàn toàn việc bắt phạt nhân viên.
- **5. Lâm Viên Đà Lạt (ZONES.dalat) – Nhổ Cây Thông ném Boss (-2 HP)**:
  - Khi người chơi di chuyển vào Quảng trường Lâm Viên Đà Lạt, nút tương tác **`[🌲 NHỔ CÂY THÔNG NÉM BOSS]`** sẽ xuất hiện.
  - Nhấn nút (hoặc phím `R` / `Space` / chạm trên màn hình) để nhổ 1 Cây Thông Đà Lạt vào kho:
    - Mỗi người chỉ được cầm tối đa **1 cây thông** (`🌲 1/1`).
    - Nút bấm Ném (`B` trên máy tính hoặc nút Ném trên điện thoại) lập tức đổi sang chế độ: **`🌲 NÉM CÂY THÔNG (-2 HP)`** kèm viền phát sáng xanh ngọc bích.
    - Cây Thông ném bay theo quỹ đạo vòng cung và nổ bung tán lá thông, trừ thẳng **2 máu (-2 HP)** của Boss!
    - Thời gian hồi chiêu: **10 giây**. Nút nhổ thông tự động ẩn đi khi đang cầm thông hoặc đang trong thời gian hồi chiêu 10 giây, chỉ hiển thị lại khi đã hồi chiêu xong.

## 11. Căn Chỉnh Bong Bóng Thoại Chat (Speech Bubble Fix)
- Khung bong bóng thoại hiển thị trên đầu nhân vật và Boss đã được thiết kế lại theo tiêu chuẩn Canvas mới:
  - Tự động ngắt dòng thông minh theo độ dài câu thoại, không bao giờ bị tràn lề hay lệch khung.
  - Đảm bảo chữ luôn được căn giữa 100% cả theo chiều ngang (`textAlign: center`) lẫn chiều dọc (`textBaseline: middle`), áp dụng đồng bộ trên cả PC lẫn điện thoại di động.
  - Có đuôi nhọn trỏ thẳng xuống tâm đầu nhân vật và bóng đổ mềm mại, sắc nét.

## Lưu ý
- Gói Free của Render ngủ sau 15 phút không có ai truy cập; người vào đầu tiên phải đợi ~1 phút.
  Khi đang có người chơi (kể cả đứng yên) server không ngủ.
- Âm thanh: đặt file mp3 vào `public/sounds/` đúng tên: clap, wow, fart, oidoioi, fahhh, toicongchuyen,
  10diem, sad, ghechua, metmoi, gidaybanoi, boss_scold (.mp3). Thiếu file thì game dùng tiếng "bíp" tổng hợp.
