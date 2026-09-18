import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  ParkingCircle,
  Phone,
  Share2,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
  Car,
  Bus,
  Clock,
  Search,
  Download,
  Link as LinkIcon,
} from "lucide-react";
import { config } from "./config.mjs";
import { calendarDays, countdown, calendarFile } from "./date.mjs";
import { createMusic, loadKakao, mapLinks, sharePayload } from "./services.mjs";
import VenueMap from "./Map.jsx";
import PhotoGallery from "./PhotoGallery.jsx";
import { stabilizeHeroViewport } from "./viewport.mjs";
import "./style.css";

const links = mapLinks(config.venue);
const ToastContext = createContext("");
const dateParts = calendarDays(config.date);
const dateLabel = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
  timeZone: "Asia/Seoul",
}).format(new Date(config.date));
const timeLabel = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
}).format(new Date(config.date));
const pad = (value) => String(value).padStart(2, "0");
const baseUrl = () =>
  config.siteUrl || new URL("./", window.location.href).href;

function IconButton({ label, children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

function SectionTitle({ label, children }) {
  return (
    <header className="section-title">
      <span className="eyebrow">{label}</span>
      <h2>{children}</h2>
      <span className="short-rule" />
    </header>
  );
}

function Modal({ title, onClose, children, className = "" }) {
  const ref = useRef(null);
  const notification = useContext(ToastContext);
  useEffect(() => {
    const dialog = ref.current;
    const priorFocus = document.activeElement;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      dialog.close();
      priorFocus?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <header className="modal-header">
          <h2>{title}</h2>
          <IconButton label="닫기" onClick={onClose}>
            <X size={21} />
          </IconButton>
        </header>
        {children}
        {notification && <p className="modal-notification" role="status">{notification}</p>}
      </div>
    </dialog>
  );
}

function GalleryViewer({ initial, photos, onClose }) {
  const [index, setIndex] = useState(initial);
  const [zoom, setZoom] = useState(false);
  const startTouch = useRef(null);
  const move = (delta) => {
    setIndex((current) => (current + delta + photos.length) % photos.length);
    setZoom(false);
  };
  useEffect(() => {
    const listener = (event) => {
      if (event.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + photos.length) % photos.length);
        setZoom(false);
      }
      if (event.key === "ArrowRight") {
        setIndex((current) => (current + 1) % photos.length);
        setZoom(false);
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [photos.length]);
  return (
    <Modal title="우리의 순간" onClose={onClose} className="viewer">
      <div
        className={`viewer-image ${zoom ? "zoomed" : ""}`}
        onTouchStart={(event) => {
          startTouch.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          const distance = event.changedTouches[0].clientX - startTouch.current;
          if (!zoom && Math.abs(distance) > 50) move(distance > 0 ? -1 : 1);
        }}
      >
        <img src={photos[index].src} alt={photos[index].alt} />
      </div>
      <div className="viewer-controls">
        <IconButton label="이전 사진" onClick={() => move(-1)}>
          <ChevronLeft />
        </IconButton>
        <span aria-live="polite">
          {pad(index + 1)} / {pad(photos.length)}
        </span>
        <IconButton
          label={zoom ? "사진 축소" : "사진 확대"}
          onClick={() => setZoom(!zoom)}
        >
          {zoom ? <ZoomOut /> : <ZoomIn />}
        </IconButton>
        <IconButton label="다음 사진" onClick={() => move(1)}>
          <ChevronRight />
        </IconButton>
      </div>
    </Modal>
  );
}

function Countdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = countdown(config.date, now);
  const ended = now >= Date.parse(config.date);
  return (
    <>
      <div className="countdown" role="timer" aria-label="예식까지 남은 시간">
        {Object.entries(remaining).map(([key, value], index) => (
          <React.Fragment key={key}>
            {index > 0 && <span className="count-separator">:</span>}
            <div>
              <strong>{pad(value)}</strong>
              <span>{["일", "시", "분", "초"][index]}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <p className="count-message">
        {ended ? (
          "함께해 주신 모든 분께 감사드립니다."
        ) : (
          <>
            {config.groom.short}와 {config.bride.short}의 결혼식이{" "}
            <strong>{remaining.days}일</strong> 남았습니다.
          </>
        )}
      </p>
    </>
  );
}

function Contacts({ onClose }) {
  return (
    <Modal title="소중한 분들께 연락하기" onClose={onClose}>
      <div className="contacts">
        {[
          ["groom", "신랑 측"],
          ["bride", "신부 측"],
        ].map(([side, label]) => (
          <section key={side}>
            <h3>{label}</h3>
            {[
              ["", config[side].name, config[side].phone],
              ["아버지", config[side].father, config[side].fatherPhone],
              ["어머니", config[side].mother, config[side].motherPhone],
            ].map(([role, name, phone]) => (
              <div className="contact-row" key={name}>
                <span>
                  <small>{role || (side === "groom" ? "신랑" : "신부")}</small>
                  {name}
                </span>
                {phone ? (
                  <div>
                    <a
                      className="icon-button"
                      href={`tel:${phone}`}
                      aria-label={`${name} 전화`}
                    >
                      <Phone size={17} />
                    </a>
                    <a
                      className="icon-button"
                      href={`sms:${phone}`}
                      aria-label={`${name} 문자`}
                    >
                      <MessageCircle size={17} />
                    </a>
                  </div>
                ) : (
                  <small>연락처 등록 예정</small>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </Modal>
  );
}

function Directions({ toast, openViewer }) {
  const [mode, setMode] = useState("car");
  const [active, setActive] = useState(null);
  const [nav, setNav] = useState(null);
  const route = config.routes.find((item) => item.id === active);
  const native = /iPad|iPhone|iPod/.test(navigator.userAgent)
    ? links.apple
    : /Android/.test(navigator.userAgent)
      ? links.android
      : links.google;
  const kakaoNavi = async () => {
    try {
      const kakao = await loadKakao(config.kakaoJsKey);
      kakao.Navi.start({
        name: config.venue.name,
        x: config.venue.lng,
        y: config.venue.lat,
        coordType: "wgs84",
      });
    } catch (error) {
      toast(error.message);
    }
  };
  return (
    <section id="location" className="location section-pad">
      <SectionTitle label="LOCATION">오시는 길</SectionTitle>
      <div className="venue-title">
        <h3>{config.venue.name}</h3>
        <p>{config.venue.detail}</p>
        <p>{config.venue.address}</p>
        {!config.venue.verified && (
          <small className="pending">주차 혜택·하차 입구 최종 확인 전</small>
        )}
      </div>
      <VenueMap venue={config.venue} route={route} />
      <div className="map-apps">
        <button onClick={() => setNav("tmap")}>
          <Navigation size={16} />
          <b className="tmap-mark">T</b>티맵
        </button>
        <button onClick={() => setNav("naver")}>
          <b className="naver-mark">N</b>네이버지도
        </button>
        <button onClick={() => setNav("kakao")}>
          <MapPin size={16} />
          카카오내비
        </button>
      </div>
      <a className="text-link native-map" href={native}>
        <MapPin size={15} />
        기본 지도 앱에서 위치 보기
        <ExternalLink size={13} />
      </a>
      <div className="travel-heading">
        <h3>편안히 오실 수 있도록</h3>
        <span>제주공항 출발</span>
      </div>
      <div className="segmented" aria-label="교통수단">
        {[
          ["car", Car, "자가용"],
          ["bus", Bus, "버스"],
        ].map(([id, Icon, name]) => (
          <button
            key={id}
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              setActive(null);
            }}
          >
            <Icon size={17} />
            {name}
          </button>
        ))}
      </div>
      <div className="routes">
        {config.routes
          .filter((item) => item.mode === mode)
          .map((item) => (
            <div className="route" key={item.id}>
              <button
                className="route-toggle"
                aria-expanded={active === item.id}
                aria-controls={`route-${item.id}`}
                onClick={() => setActive(active === item.id ? null : item.id)}
              >
                <span>
                  {item.name}
                  <small>
                    <Clock size={12} />
                    {item.minutes[0]}~{item.minutes[1]}분 ·{" "}
                    예상 소요시간
                  </small>
                </span>
                <ChevronDown
                  size={18}
                  className={active === item.id ? "rotated" : ""}
                />
              </button>
              {active === item.id && (
                <div id={`route-${item.id}`} className="route-content">
                  {!item.verified && (
                    <p className="pending">
                      {item.roadGeometry
                        ? `도로 기준 약 ${item.distanceKm}km. 예상 소요시간은 실시간 교통을 반영하지 않으며 정체·주차 상황에 따라 더 걸릴 수 있습니다. 최종 하차 입구는 확인 중입니다.`
                        : "탑승·하차 안내는 ICC 공식 자료 기준입니다. 지도상의 노선과 정류장 좌표는 시안이며, 대기·도보에 따라 시간이 추가될 수 있습니다."}
                    </p>
                  )}
                  <ol style={{ "--route-color": item.color }}>
                    {item.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p className="road-names">{item.roads.join(" → ")}</p>
                  {mode === "bus" && <p className="fine-print">예상 소요시간은 60~90분입니다. 대기·도보·교통 상황에 따라 더 걸릴 수 있으며 실제 도착시간을 보장하지 않습니다.</p>}
                  {mode === "bus" && (
                    <div className="timetable">
                      {item.timetable ? (
                        <button
                          className="timetable-photo"
                          onClick={() =>
                            openViewer(
                              [
                                {
                                  src: item.timetable,
                                  alt: `${item.name} 시간표`,
                                },
                              ],
                              0,
                            )
                          }
                        >
                          <img
                            src={item.timetable}
                            alt={`${item.name} 시간표`}
                          />
                          <span>
                            <ZoomIn size={15} />
                            시간표 크게 보기
                          </span>
                        </button>
                      ) : (
                        <div className="timetable-placeholder" role="img" aria-label={`${item.name} 시간표 이미지 준비 중`} />
                      )}
                      {item.timetable && (
                        <>
                          <p className="fine-print">600·601번 통합 시간표 · 공항 출발<br />원본 시행일 2024.08.01 · 확인일 2026.09.18</p>
                          <a className="text-link" href="https://bus.jeju.go.kr/publicTrafficInformation/generalBusSchedule?viewtype=2" target="_blank" rel="noreferrer">제주버스정보시스템 최신 시간표 <ExternalLink size={14} /></a>
                          <a className="text-link" href="https://bus.jeju.go.kr/data/schedule/downScheduleExcel?gscheduleId=405067" target="_blank" rel="noreferrer">공식 시간표 Excel 원본 <ExternalLink size={14} /></a>
                        </>
                      )}
                    </div>
                  )}
                  <a
                    href={links.naver}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                  >
                    최신 길찾기 확인
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          ))}
      </div>
      <div className="parking">
        <ParkingCircle size={23} />
        <div>
          <h3>주차 안내</h3>
          <p>{config.venue.parking}</p>
          <small>예식 시작 30분 전 도착을 권해드립니다.</small>
          <a className="text-link" href="https://www.iccjeju.co.kr/guide/03.php" target="_blank" rel="noreferrer">공식 주차 안내<ExternalLink size={13} /></a>
        </div>
      </div>
      <p className="fine-print"><a className="text-link" href="https://www.iccjeju.co.kr/guide/02.php" target="_blank" rel="noreferrer">ICC 공식 교통·버스 안내<ExternalLink size={13} /></a><br />2026. 09. 17 확인 · 운행·요금은 변경될 수 있습니다.</p>
      {nav && (
        <Modal
          title={`${{ tmap: "티맵", naver: "네이버지도", kakao: "카카오내비" }[nav]}로 길찾기`}
          onClose={() => setNav(null)}
        >
          <p className="nav-destination">
            {config.venue.name}
            <br />
            <small>{config.venue.address}</small>
          </p>
          {nav === "kakao" ? (
            <button className="button primary full" onClick={kakaoNavi}>
              <Navigation size={17} />
              카카오내비 앱 열기
            </button>
          ) : (
            <a
              className="button primary full"
              href={nav === "tmap" ? links.tmap : links.naverApp}
            >
              <Navigation size={17} />앱 열기
            </a>
          )}
          <a
            className="button full"
            href={nav === "kakao" ? links.kakao : links.naver}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} />웹 지도에서 확인
          </a>
          <p className="fine-print">
            앱 설치가 필요합니다.
            {nav === "kakao" && !config.kakaoJsKey
              ? " 카카오내비 연동 전에는 웹 지도를 이용해 주세요."
              : ""}
          </p>
        </Modal>
      )}
    </section>
  );
}

function ShareModal({ onClose, toast, copy }) {
  const [busy, setBusy] = useState(false);
  const share = async () => {
    setBusy(true);
    try {
      if (!config.siteUrl)
        throw new Error(
          "공개 배포 주소와 카카오 키를 등록한 뒤 전송할 수 있습니다.",
        );
      const kakao = await loadKakao(config.kakaoJsKey);
      kakao.Share.sendDefault(sharePayload(config, baseUrl()));
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };
  const nativeShare = async () => {
    try {
      if (navigator.share)
        await navigator.share({
          title: config.title,
          text: config.description,
          url: baseUrl(),
        });
      else await copy(baseUrl());
    } catch (error) {
      if (error.name !== "AbortError")
        toast("공유하지 못했습니다. 링크 복사를 이용해 주세요.");
    }
  };
  return (
    <Modal title="기쁜 소식 전하기" onClose={onClose}>
      <div className="share-preview">
        <img src={config.shareImage} alt="공유 미리보기 사진" />
        <div className="share-copy">
          <strong>{config.title}</strong>
          <p>{config.description}</p>
          <div className="share-preview-buttons">
            <a
              href="./"
              onClick={(event) => {
                const home = document.querySelector("#home");
                if (home) {
                  event.preventDefault();
                  onClose();
                  home.scrollIntoView();
                }
              }}
            >
              청첩장 보기
            </a>
            <a href="?view=location">위치 보기</a>
          </div>
        </div>
      </div>
      <button
        className="button kakao-button full"
        onClick={share}
        disabled={busy}
      >
        <MessageCircle size={17} />
        {busy ? "연결 중" : "카카오톡으로 공유"}
      </button>
      <div className="two-buttons">
        <button className="button" onClick={nativeShare}>
          <Share2 size={16} />
          공유하기
        </button>
        <button className="button" onClick={() => copy(baseUrl())}>
          <LinkIcon size={16} />
          링크 복사
        </button>
      </div>
      {config.demo && (
        <p className="fine-print">
          공유 카드 시안 · 실제 카카오 전송은 배포 주소와 키 등록 후 가능합니다.
        </p>
      )}
    </Modal>
  );
}

function Research() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("전체");
  useEffect(() => {
    fetch("./research/samples.json")
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }, []);
  const samples =
    data?.samples.filter(
      (item) =>
        (provider === "전체" || item.provider === provider) &&
        `${item.name} ${item.code}`.toLowerCase().includes(query.toLowerCase()),
    ) || [];
  return (
    <div className="research-page">
      <header className="research-top">
        <a href="./">
          <ArrowLeft size={17} />
          청첩장으로
        </a>
        <span>DESIGN REFERENCE / 100</span>
        <a href="./research/samples.md" download>
          <Download size={17} />
          목록 받기
        </a>
      </header>
      <main className="research-main">
        <span className="eyebrow">A HUNDRED WAYS TO SAY, WE DO</span>
        <h1>우리다운 초대를 찾아서</h1>
        <p>
          한국 모바일 청첩장 공개 디자인 100종. 잇츠카드 42종, 바른손M카드 58종.
        </p>
        <p className="fine-print">
          업체 공개 상품 목록의 링크를 수집했습니다. 개별 100종의 기능을 모두
          검증한 목록은 아닙니다. 사진·디자인 권리는 각 제공자에게 있습니다.
        </p>
        <div className="research-filters">
          <div className="segmented">
            {["전체", "잇츠카드", "바른손M카드"].map((name) => (
              <button
                key={name}
                aria-pressed={provider === name}
                onClick={() => setProvider(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={17} />
            <input
              aria-label="디자인 검색"
              placeholder="디자인 이름 또는 코드"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <p className="result-count">{samples.length}개의 디자인</p>
        {error && (
          <p role="alert">목록을 불러오지 못했습니다. 새로고침해 주세요.</p>
        )}
        {!data && !error && <p>목록을 불러오는 중입니다.</p>}
        <div className="reference-grid">
          {samples.map((item) => (
            <a
              key={item.id}
              className="reference-card"
              href={item.url}
              target="_blank"
              rel="noreferrer"
            >
              <div className="reference-image">
                <img
                  src={item.thumbnail}
                  alt={`${item.name} 업체 공개 샘플`}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <span>{pad(item.id)}</span>
              </div>
              <small>
                {item.provider} / {item.code}
              </small>
              <h2>
                {item.name}
                <ExternalLink size={14} />
              </h2>
              <span className="reference-category">{item.category}</span>
            </a>
          ))}
        </div>
        {data && samples.length === 0 && <p>일치하는 디자인이 없습니다.</p>}
        <section className="recommendations">
          <SectionTitle label="THOUGHTFUL DETAILS">
            추가하면 좋을 것들
          </SectionTitle>
          <div>
            <article>
              <span>01</span>
              <h3>참석 여부와 식사 인원</h3>
              <p>
                신랑·신부 측, 동행 인원, 식사 여부를 한 번에. 개인정보 동의와
                응답 삭제 기한을 함께 설정하는 방식을 추천합니다.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>제주에 오는 하객을 위한 안내</h3>
              <p>
                항공편 지연에 대비한 여유시간, 공항 출발 셔틀, 숙소 추천, 우천
                시 하차 동선을 추가하면 유용합니다.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>모두에게 편안한 초대</h3>
              <p>
                큰 글씨, 휠체어 진입로, 수유실, 어르신 하차 위치. 과한 효과 대신
                줄어든 모션과 기본 음소거를 유지합니다.
              </p>
            </article>
            <article>
              <span>04</span>
              <h3>예식 이후에도 남는 기록</h3>
              <p>
                감사 인사와 사진 공유로 전환하고, 연락처·계좌·참석자 정보는 보관
                기한에 맞춰 비공개 처리합니다.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

function Invitation() {
  const entranceText = "소중한 분들을 초대합니다.";
  const [sound, setSound] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const player = useRef(null);
  const [modal, setModal] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [toastText, setToastText] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  const toastTimer = useRef(null);
  const locationOnly =
    new URLSearchParams(window.location.search).get("view") === "location";
  const [entrance, setEntrance] = useState(
    () =>
      !locationOnly &&
      !window.location.hash &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (!entrance) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => setEntrance(false);
    const onMotionChange = () => {
      if (motion.matches) finish();
    };
    motion.addEventListener("change", onMotionChange);
    window.addEventListener("hashchange", finish);
    return () => {
      motion.removeEventListener("change", onMotionChange);
      window.removeEventListener("hashchange", finish);
    };
  }, [entrance]);
  const toast = (text) => {
    setToastText(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(""), 5000);
  };
  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toast("복사되었습니다.");
    } catch {
      setCopyFallback(value);
    }
  };
  const toggleSound = async () => {
    setAudioBusy(true);
    try {
      if (!player.current)
        player.current = config.musicUrl
          ? new Audio(config.musicUrl)
          : createMusic();
      if (config.musicUrl) {
        player.current.loop = true;
        player.current.volume = 0.35;
      }
      if (sound) {
        await player.current.pause();
        setSound(false);
      } else {
        await player.current.play();
        setSound(true);
      }
    } catch {
      toast("음악을 재생하지 못했습니다. 다시 눌러 주세요.");
      setSound(false);
    } finally {
      setAudioBusy(false);
    }
  };
  useEffect(() => {
    const hide = () => {
      if (document.hidden && player.current) {
        player.current.pause();
        setSound(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      player.current?.pause();
      player.current?.close?.();
      clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08, rootMargin: "0px 0px -64px 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  const downloadCalendar = () => {
    const url = URL.createObjectURL(
      new Blob([calendarFile(config)], { type: "text/calendar;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "wedding.ics";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("일정 파일을 내려받았습니다. 캘린더에서 열어 추가해 주세요.");
  };
  const openViewer = (photos, initial) => setViewer({ photos, initial });
  return (
    <ToastContext.Provider value={toastText}>
      <a className="skip-link" href="#invitation">
        초대글로 바로가기
      </a>
      <header className="topbar">
        <a className="monogram" href="./">
          {config.groom.english[0]} <span>&</span> {config.bride.english[0]}
          <span className="top-date">
            {dateParts.year}. {pad(dateParts.month)}. {pad(dateParts.day)}
          </span>
        </a>
        <div className="top-actions">
          {config.demo && <span className="sample-tag">SAMPLE INVITATION</span>}
          <IconButton
            className={sound ? "sound-on" : ""}
            label={sound ? "배경음 끄기" : "배경음 켜기"}
            aria-pressed={sound}
            onClick={toggleSound}
            disabled={audioBusy}
          >
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </IconButton>
        </div>
      </header>
      <main>
        {!locationOnly && (
          <>
            <section className="hero" id="home">
              <img
                className="hero-photo"
                src={config.hero}
                alt="신랑 신부 웨딩 사진 · 시안용 이미지"
                fetchPriority="high"
              />
              <div className="hero-shade" />
              {entrance && (
                <div
                  className="wedding-entrance"
                  data-testid="wedding-entrance"
                  style={{ "--entrance-clear-delay": `${0.5 + Array.from(entranceText).length * 0.14 + 1.4}s` }}
                  onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget && event.animationName === "entrance-clear") setEntrance(false);
                  }}
                >
                  <p aria-label={entranceText}>
                    {Array.from(entranceText).map((letter, index) => (
                      <span
                        key={index}
                        aria-hidden="true"
                        style={{ "--letter-delay": `${0.5 + index * 0.14}s` }}
                      >
                        {letter}
                      </span>
                    ))}
                  </p>
                  <IconButton label="진입 효과 건너뛰기" onClick={() => setEntrance(false)}>
                    <X size={18} />
                  </IconButton>
                </div>
              )}
              <div className="entrance-petals" aria-hidden="true">
                {Array.from({ length: 14 }, (_, index) => (
                  <span
                    key={index}
                    style={{
                      "--petal-left": `${(index * 37) % 100}%`,
                      "--petal-delay": `${index * 0.23}s`,
                      "--petal-drift": `${index % 2 ? 48 : -36}px`,
                      "--petal-turn": `${120 + index * 31}deg`,
                    }}
                  />
                ))}
              </div>
              <div className="hero-topline">
                <span>THE WEDDING OF</span>
                <span>JEJU, KOREA</span>
              </div>
              <div className="hero-content">
                <p className="hero-script">Together, in every season.</p>
                <h1>
                  {config.groom.short}
                  <span>&</span>
                  {config.bride.short}
                </h1>
                <p className="hero-message">
                  가장 다정한 날, 우리의 시작에 초대합니다.
                </p>
              </div>
              <div className="hero-bottom">
                <p>
                  {dateParts.year}. {pad(dateParts.month)}. {pad(dateParts.day)}
                  <span>
                    {timeLabel} · {config.venue.name}
                  </span>
                </p>
                <a href="#invitation" aria-label="초대글 보기">
                  <ArrowDown size={21} />
                </a>
              </div>
            </section>
            <section id="invitation" className="invitation section-pad reveal">
              <SectionTitle label="YOU ARE INVITED">
                우리, 결혼합니다
              </SectionTitle>
              <div className="invitation-message">
                {config.message.map((line, index) =>
                  line ? <p key={index}>{line}</p> : <br key={index} />,
                )}
              </div>
              <div className="family-lines">
                <p>
                  {config.groom.father}
                  <span>·</span>
                  {config.groom.mother}
                  <small>의 아들</small>
                  <strong>{config.groom.short}</strong>
                </p>
                <p>
                  {config.bride.father}
                  <span>·</span>
                  {config.bride.mother}
                  <small>의 딸</small>
                  <strong>{config.bride.short}</strong>
                </p>
              </div>
              <button
                className="button contact-button"
                onClick={() => setModal("contacts")}
              >
                <Phone size={15} />
                연락하기
              </button>
              <span className="little-flower" aria-hidden="true">
                <Heart size={19} strokeWidth={1} />
              </span>
            </section>
            <section className="date-section section-pad reveal" id="date">
              <SectionTitle label="SAVE THE DATE">우리의 약속</SectionTitle>
              <p className="date-full">
                {dateLabel}
                <br />
                {timeLabel}
              </p>
              <div className="calendar">
                <div className="calendar-month">
                  <span>{dateParts.year}</span>
                  <strong>{pad(dateParts.month)}</strong>
                  <span>
                    {new Intl.DateTimeFormat("en", {
                      month: "long",
                      timeZone: "Asia/Seoul",
                    }).format(new Date(config.date))}
                  </span>
                </div>
                <div className="calendar-grid">
                  {"일월화수목금토".split("").map((name, index) => (
                    <span
                      className={`weekday ${index === 0 ? "sunday" : ""}`}
                      key={name}
                    >
                      {name}
                    </span>
                  ))}
                  {Array.from({ length: dateParts.offset }, (_, index) => (
                    <span key={`blank-${index}`} />
                  ))}
                  {Array.from({ length: dateParts.total }, (_, index) => (
                    <span
                      key={index}
                      className={`${index + 1 === dateParts.day ? "wedding-day" : ""} ${(index + dateParts.offset) % 7 === 0 ? "sunday" : ""}`}
                      aria-label={`${dateParts.month}월 ${index + 1}일${index + 1 === dateParts.day ? ", 결혼식" : ""}`}
                    >
                      {index + 1}
                    </span>
                  ))}
                </div>
              </div>
              <button className="button" onClick={downloadCalendar}>
                <CalendarPlus size={16} />
                캘린더에 일정 추가
              </button>
              <Countdown />
            </section>
            <section
              className="gallery-section section-pad reveal"
              id="gallery"
            >
              <SectionTitle label="OUR MOMENTS">함께한 모든 순간</SectionTitle>
              <PhotoGallery photos={config.gallery} openViewer={openViewer} />
              <p className="gallery-note">
                <span>Every little moment,</span>
                <br />
                led me to you.
              </p>
            </section>
          </>
        )}
        <Directions toast={toast} openViewer={openViewer} />
        {!locationOnly && (
          <>
            <section
              className="accounts-section section-pad reveal"
              id="accounts"
            >
              <SectionTitle label="WITH LOVE">마음 전하실 곳</SectionTitle>
              <p className="section-message">
                멀리서도 축하의 마음을 전해주시는 분들께
                <br />
                감사한 마음으로 안내드립니다.
              </p>
              {[
                ["groom", "신랑 측 계좌"],
                ["bride", "신부 측 계좌"],
              ].map(([side, title]) => (
                <details className={`accounts ${side}`} key={side}>
                  <summary>
                    <span>
                      <Heart size={16} />
                      {title}
                    </span>
                    <ChevronDown size={17} />
                  </summary>
                  <div>
                    {config.accounts
                      .filter((account) => account.side === side)
                      .map((account) => (
                        <div className="account-row" key={account.role}>
                          <div>
                            <p>
                              <small>{account.role}</small>
                              {account.name}
                            </p>
                            <span>
                              {account.number
                                ? `${account.bank} ${account.number}`
                                : "계좌 등록 예정"}
                            </span>
                          </div>
                          <IconButton
                            label={`${account.name} 계좌 복사`}
                            disabled={!account.number}
                            onClick={() => copy(account.number)}
                          >
                            <Copy size={16} />
                          </IconButton>
                        </div>
                      ))}
                  </div>
                </details>
              ))}
            </section>
            <section className="closing">
              <img
                src="./images/moment-1.jpg"
                alt="웨딩의 따뜻한 순간 · 시안용 사진"
                loading="lazy"
              />
              <div>
                <span className="eyebrow">WITH ALL OUR HEARTS</span>
                <h2>
                  저희의 시작을
                  <br />
                  함께해 주셔서 감사합니다.
                </h2>
                <p>
                  {config.groom.name} · {config.bride.name}
                </p>
              </div>
            </section>
            <section className="share-section">
              <button
                className="button primary"
                onClick={() => setModal("share")}
              >
                <Share2 size={16} />
                기쁜 소식 함께 나누기
              </button>
              <p>사랑으로 가득 채워갈 우리의 모든 날</p>
              <span className="footer-signature">
                {config.groom.english} & {config.bride.english}
              </span>
            </section>
          </>
        )}
        {locationOnly && (
          <div className="location-back">
            <a className="button" href="./">
              <ArrowLeft size={16} />
              청첩장 보기
            </a>
          </div>
        )}
      </main>
      <nav className="bottom-nav" aria-label="청첩장 바로가기">
        <a href={locationOnly ? "./#date" : "#date"}>
          <CalendarPlus size={17} />
          <span>예식일</span>
        </a>
        <a href="#location">
          <MapPin size={17} />
          <span>오시는 길</span>
        </a>
        <button onClick={() => setModal("contacts")}>
          <Phone size={16} />
          <span>연락하기</span>
        </button>
        <button onClick={() => setModal("share")}>
          <Share2 size={17} />
          <span>공유하기</span>
        </button>
      </nav>
      {modal === "contacts" && <Contacts onClose={() => setModal(null)} />}
      {modal === "share" && (
        <ShareModal onClose={() => setModal(null)} toast={toast} copy={copy} />
      )}
      {viewer && <GalleryViewer {...viewer} onClose={() => setViewer(null)} />}
      {copyFallback && (
        <Modal title="복사할 내용" onClose={() => setCopyFallback("")}>
          <input
            className="copy-input"
            readOnly
            value={copyFallback}
            onFocus={(event) => event.target.select()}
          />
          <p>클립보드 접근이 제한되었습니다. 내용을 선택해 복사해 주세요.</p>
        </Modal>
      )}
      {toastText && (
        <div className="toast" role="status">
          {toastText}
        </div>
      )}
    </ToastContext.Provider>
  );
}

const releaseHeroViewport = stabilizeHeroViewport(window);
if (import.meta.hot) import.meta.hot.dispose(releaseHeroViewport);

createRoot(document.getElementById("root")).render(
  new URLSearchParams(window.location.search).get("view") === "research" ? (
    <Research />
  ) : (
    <Invitation />
  ),
);
