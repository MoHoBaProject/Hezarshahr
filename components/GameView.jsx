'use client';
import { useEffect, useRef, useState } from 'react';
import { FOLLOWERS } from '../lib/config';

const fa = (n) => Number(n).toLocaleString('fa-IR');

export default function GameView() {
  const stageRef = useRef(null);
  const gameRef = useRef(null);
  const [st, setSt] = useState({ money: 5000, pop: 0, cap: 0 });
  const [build, setBuild] = useState(false);
  const [toast, setToast] = useState('');
  const [ready, setReady] = useState(false);
  const [followers, setFollowers] = useState(FOLLOWERS);

  useEffect(() => {
    let game = null;
    let cancelled = false;
    let timer = null;
    (async () => {
      const { Game } = await import('../lib/game');
      if (cancelled || !stageRef.current) return;
      game = new Game(stageRef.current, {
        onState: setSt,
        onToast: (m) => {
          setToast(m);
          clearTimeout(timer);
          timer = setTimeout(() => setToast(''), 2200);
        },
      });
      gameRef.current = game;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (game) game.dispose();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    let stop = false;
    const load = () =>
      fetch('/api/followers')
        .then((r) => r.json())
        .then((d) => { if (!stop && typeof d.n === 'number') setFollowers(d.n); })
        .catch(() => {});
    load();
    const id = setInterval(load, 300000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  const toggleBuild = () => {
    const next = !build;
    setBuild(next);
    if (gameRef.current) gameRef.current.setBuildMode(next);
  };

  const reset = () => {
    if (window.confirm('بازی از اول شروع بشه؟')) {
      setBuild(false);
      gameRef.current && gameRef.current.reset();
    }
  };

  const full = st.cap > 0 && st.pop >= st.cap;

  return (
    <>
      <div className="stage" ref={stageRef} />
      {!ready && <div className="loading">در حال ساخت هزارشهر…</div>}
      <div className="hud">
        <div className="pill gold">
          <small>خزانه شهر</small>
          <b>{fa(st.money)} €</b>
        </div>
        <div className="pill">
          <small>شهروندان</small>
          <b>{fa(followers)}</b>
        </div>
        <div className={'pill' + (full ? ' warn' : '')}>
          <small>ظرفیت مسکن</small>
          <b>{fa(st.pop)} / {fa(st.cap)}</b>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
      <div className="dock">
        <button className={'btn' + (build ? ' on' : '')} onClick={toggleBuild}>
          {build ? 'روی زمین بزن تا خونه ساخته شه' : 'ساخت خانه (۵۰۰ €)'}
        </button>
        <button className="btn small" onClick={() => gameRef.current && gameRef.current.exportScale()} aria-label="دانلود مقیاس‌ها">📏</button>
        <button className="btn small" onClick={reset} aria-label="شروع دوباره">⟲</button>
      </div>
    </>
  );
}
