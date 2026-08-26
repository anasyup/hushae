import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';
import { resolvePreset } from './dashboard/RangePicker';

/* ============================================================================
 * OVERVIEW — the approved reference (overview_perfect_final.html) applied
 * VERBATIM: its exact CSS (scoped under .ovp-root), its exact markup, its
 * exact Chart.js configurations. Only the demo numbers are replaced — every
 * value below is live HUSHAE data (PKR). The reference's hamburger opens the
 * app sidebar drawer (AdminLayout chromeless mode).
 * ======================================================================== */

const OVP_CSS = `
.ovp-root{--bg:#f8f8f7;--card:#fff;--border:#ececec;--border-light:#f1f1f1;--text:#111;--muted:#6b7280;--muted2:#9ca3af;--green:#0e9f6e;--green-bg:#ecfdf5;--green-text:#065f46;--yellow-bg:#fef3c7;--yellow-text:#92400e;--black:#111}
.ovp-root *{margin:0;padding:0;box-sizing:border-box}
.ovp-root{scroll-behavior:smooth}
.ovp-root{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--text);font-size:13px;line-height:1.45;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.ovp-root .wrap{max-width:1580px;margin:0 auto;padding:14px 18px 32px;animation:ovpFadeIn .5s ease}
@keyframes ovpFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.ovp-root .topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px;flex-wrap:wrap;position:sticky;top:0;z-index:50;background:var(--bg);padding:8px 0}
.ovp-root .top-left{display:flex;align-items:center;gap:12px}
.ovp-root .hamburger{width:32px;height:32px;display:grid;place-items:center;border-radius:8px;cursor:pointer;transition:.15s}
.ovp-root .hamburger:hover{background:#eee}
.ovp-root .top-title h1{font-size:16.5px;font-weight:700;letter-spacing:-0.3px}
.ovp-root .top-title p{font-size:12px;color:var(--muted);margin-top:1px}
.ovp-root .top-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ovp-root .search{position:relative;background:var(--card);border:1px solid var(--border);border-radius:10px;height:36px;min-width:320px;display:flex;align-items:center;padding:0 12px;gap:8px;box-shadow:0 1px 2px rgba(0,0,0,0.03);transition:.15s}
.ovp-root .search:focus-within{border-color:#111;box-shadow:0 0 0 3px rgba(17,17,17,0.08)}
.ovp-root .search input{border:0;outline:0;background:transparent;width:100%;font-size:12.5px;color:var(--text)}
.ovp-root .search input::placeholder{color:var(--muted2)}
.ovp-root .kbd{font-size:10px;color:var(--muted2);border:1px solid var(--border);background:#fafafa;border-radius:5px;padding:2px 5px}
.ovp-root .pill{height:36px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:0 12px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.03);transition:.15s;position:relative;user-select:none}
.ovp-root .pill:hover{border-color:#bbb}
.ovp-root .pill.active{border-color:#111}
.ovp-root .dropdown{position:absolute;top:42px;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.08);padding:6px;display:none;z-index:100;min-width:180px}
.ovp-root .dropdown.show{display:block;animation:ovpDropIn .18s ease}
@keyframes ovpDropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.ovp-root .dropdown div{padding:8px 10px;border-radius:8px;font-size:11.5px;cursor:pointer;transition:.12s}
.ovp-root .dropdown div:hover{background:#f5f5f5}
.ovp-root .btn-black{height:36px;background:var(--black);color:#fff;border:0;border-radius:10px;padding:0 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;transition:.18s;box-shadow:0 1px 2px rgba(0,0,0,0.08)}
.ovp-root .btn-black:hover{background:#222;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.ovp-root .btn-black:active{transform:translateY(0)}
.ovp-root .icon-btn{width:36px;height:36px;background:var(--card);border:1px solid var(--border);border-radius:10px;display:grid;place-items:center;cursor:pointer;position:relative;box-shadow:0 1px 2px rgba(0,0,0,0.03);transition:.15s}
.ovp-root .icon-btn:hover{border-color:#bbb;transform:translateY(-1px)}
.ovp-root .badge{position:absolute;top:-5px;right:-5px;background:var(--black);color:#fff;font-size:9px;font-weight:700;min-width:18px;height:18px;border-radius:20px;display:grid;place-items:center;padding:0 4px;border:2px solid var(--bg);animation:ovpBadgePop .4s ease}
@keyframes ovpBadgePop{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
.ovp-root .stats{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:12px}
@media(max-width:1380px){.ovp-root .stats{grid-template-columns:repeat(3,1fr)}}
@media(max-width:680px){.ovp-root .stats{grid-template-columns:repeat(2,1fr)}}
.ovp-root .stat{background:var(--card);border:1px solid var(--border-light);border-radius:12px;padding:12px 14px 10px;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:.22s;position:relative;overflow:hidden;cursor:pointer;animation:ovpCardIn .5s ease backwards}
.ovp-root .stat:nth-child(1){animation-delay:.05s}.ovp-root .stat:nth-child(2){animation-delay:.1s}.ovp-root .stat:nth-child(3){animation-delay:.15s}.ovp-root .stat:nth-child(4){animation-delay:.2s}.ovp-root .stat:nth-child(5){animation-delay:.25s}.ovp-root .stat:nth-child(6){animation-delay:.3s}
@keyframes ovpCardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.ovp-root .stat:hover{transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,0.07);border-color:#e0e0e0}
.ovp-root .stat-head{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:11px;font-weight:500;margin-bottom:10px}
.ovp-root .stat-head svg{width:14px;height:14px;stroke:#6b7280}
.ovp-root .stat-val{font-size:18px;font-weight:700;letter-spacing:-0.3px}
.ovp-root .stat-foot{display:flex;align-items:flex-end;justify-content:space-between;margin-top:8px}
.ovp-root .stat-change{font-size:11px;font-weight:600;color:var(--green);display:flex;align-items:center;gap:2px}
.ovp-root .stat-change svg{width:10px;height:10px}
.ovp-root .stat-vs{font-size:10px;color:var(--muted2);margin-top:2px}
.ovp-root .spark{width:78px;height:28px}
.ovp-root .grid3{display:grid;grid-template-columns:1.7fr 1.05fr 0.78fr;gap:10px;margin-bottom:10px}
@media(max-width:1200px){.ovp-root .grid3{grid-template-columns:1fr}}
.ovp-root .card{background:var(--card);border:1px solid var(--border-light);border-radius:12px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:.22s;animation:ovpCardIn .5s ease backwards}
.ovp-root .card:hover{box-shadow:0 6px 18px rgba(0,0,0,0.05)}
.ovp-root .card-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.ovp-root .card-t{font-size:12.5px;font-weight:700;letter-spacing:-0.15px;display:flex;align-items:center;gap:6px}
.ovp-root .info{width:14px;height:14px;border:1px solid #ddd;border-radius:50%;display:grid;place-items:center;font-size:8px;color:#888;cursor:pointer;transition:.15s}
.ovp-root .info:hover{background:#111;color:#fff;border-color:#111}
.ovp-root .btn-sm{border:1px solid var(--border);background:var(--card);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:500;cursor:pointer;transition:.15s;user-select:none}
.ovp-root .btn-sm:hover{background:#f9f9f9;border-color:#bbb;transform:translateY(-1px)}
.ovp-root .btn-sm:active{transform:translateY(0)}
.ovp-root .legend{display:flex;gap:16px;font-size:10.5px;color:var(--muted);margin-bottom:8px}
.ovp-root .legend span{display:flex;align-items:center;gap:5px}
.ovp-root .legend b{width:14px;height:2px;border-radius:2px;display:inline-block}
.ovp-root .chart-main{height:200px;position:relative}
.ovp-root .donut-row{display:flex;gap:16px;align-items:center}
.ovp-root .donut{width:138px;height:138px;position:relative;flex-shrink:0}
.ovp-root .donut canvas{width:100%!important;height:100%!important}
.ovp-root .donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;text-align:center}
.ovp-root .donut-center b{font-size:12.5px;font-weight:700}
.ovp-root .donut-center span{font-size:10px;color:var(--muted)}
.ovp-root .ch-list{flex:1}
.ovp-root .ch-item{display:flex;align-items:center;gap:8px;font-size:11px;padding:4.5px 0;transition:.12s;border-radius:6px;padding-left:4px;margin-left:-4px}
.ovp-root .ch-item:hover{background:#f9f9f9}
.ovp-root .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.ovp-root .ch-item .pct{margin-left:auto;color:var(--muted);width:32px;text-align:right}
.ovp-root .ch-item .val{width:68px;text-align:right;font-weight:600}
.ovp-root .live-top{display:flex;justify-content:space-between;align-items:center}
.ovp-root .live-dot{width:6px;height:6px;background:#10b981;border-radius:50%;display:inline-block;box-shadow:0 0 0 3px #d1fae5;animation:ovpPulse 2s infinite}
@keyframes ovpPulse{0%{box-shadow:0 0 0 0 #d1fae5}70%{box-shadow:0 0 0 6px rgba(209,250,229,0)}100%{box-shadow:0 0 0 0 rgba(209,250,229,0)}}
.ovp-root .live-num{font-size:18px;font-weight:700;margin-top:4px;transition:.3s}
.ovp-root .live-sub{font-size:11px;color:var(--muted)}
.ovp-root .live-bars{display:flex;align-items:flex-end;gap:2.5px;height:34px;margin:10px 0}
.ovp-root .live-bars div{background:var(--black);width:3.5px;border-radius:2px;transition:height .6s cubic-bezier(.34,1.56,.64,1)}
.ovp-root .pages{font-size:11px}
.ovp-root .page-row{display:flex;justify-content:space-between;padding:2.5px 0;color:#222;transition:.12s;border-radius:4px;padding-left:4px;margin-left:-4px}
.ovp-root .page-row:hover{background:#f9f9f9}
.ovp-root .page-row span:last-child{color:var(--muted)}
.ovp-root .page-row.head{color:var(--muted);font-weight:600;margin-bottom:2px;font-size:10.5px}
.ovp-root .page-row.head:hover{background:transparent}
.ovp-root .grid4{display:grid;grid-template-columns:0.92fr 1.12fr 1fr;gap:10px;margin-bottom:10px}
@media(max-width:1200px){.ovp-root .grid4{grid-template-columns:1fr}}
.ovp-root .glance{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
@media(max-width:600px){.ovp-root .glance{grid-template-columns:repeat(2,1fr)}}
.ovp-root .g-item{border:1px solid var(--border-light);border-radius:10px;padding:10px;text-align:center;background:#fff;transition:.18s;cursor:pointer}
.ovp-root .g-item:hover{border-color:#111;transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.06)}
.ovp-root .g-ico{width:28px;height:28px;background:#f8f8f7;border:1px solid #f0f0f0;border-radius:7px;display:grid;place-items:center;margin:0 auto;transition:.15s}
.ovp-root .g-item:hover .g-ico{background:#111;border-color:#111}
.ovp-root .g-item:hover .g-ico svg{stroke:#fff}
.ovp-root .g-ico svg{width:14px;height:14px;transition:.15s}
.ovp-root .g-item b{font-size:14px;display:block;margin:6px 0 1px;font-weight:700}
.ovp-root .g-item span{font-size:10px;color:var(--muted)}
.ovp-root .view-all{font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:4px;margin-top:10px;cursor:pointer;transition:.18s}
.ovp-root .view-all:hover{gap:8px;color:#000}
.ovp-root .tbl{width:100%;border-collapse:collapse}
.ovp-root .tbl th{font-size:10px;color:var(--muted2);font-weight:500;text-align:left;padding:7px 0;border-bottom:1px solid #f2f2f2;letter-spacing:0.3px;text-transform:uppercase}
.ovp-root .tbl td{font-size:11px;padding:8px 0;border-bottom:1px solid #fafafa;vertical-align:middle;transition:.12s}
.ovp-root .tbl tr{transition:.12s}
.ovp-root .tbl tbody tr:hover{background:#fafafa}
.ovp-root .tbl tbody tr:hover td{border-bottom-color:#f0f0f0}
.ovp-root .prod{display:flex;align-items:center;gap:8px}
.ovp-root .prod-ico{width:22px;height:22px;background:#f5f5f4;border:1px solid #efefef;border-radius:6px;display:grid;place-items:center;flex-shrink:0}
.ovp-root .prod-ico svg{width:12px;height:12px}
.ovp-root .badge-paid{background:var(--green-bg);color:var(--green-text);border-radius:20px;padding:3px 9px;font-size:10px;font-weight:700;display:inline-block;border:1px solid #d1fae5}
.ovp-root .badge-pending{background:var(--yellow-bg);color:var(--yellow-text);border-radius:20px;padding:3px 9px;font-size:10px;font-weight:700;display:inline-block;border:1px solid #fde68a}
.ovp-root .grid4b{display:grid;grid-template-columns:1fr 0.72fr 1fr 0.84fr;gap:10px;margin-bottom:10px}
@media(max-width:1300px){.ovp-root .grid4b{grid-template-columns:1fr 1fr}}
@media(max-width:700px){.ovp-root .grid4b{grid-template-columns:1fr}}
.ovp-root .rev-tabs{display:flex;gap:6px;margin-bottom:10px;align-items:center}
.ovp-root .rev-tab{font-size:10px;padding:4px 10px;border-radius:20px;font-weight:600;cursor:pointer;transition:.18s;border:1px solid transparent;user-select:none}
.ovp-root .rev-tab.active{background:var(--black);color:#fff;transform:scale(1.02)}
.ovp-root .rev-tab.idle{background:#f3f3f2;color:var(--muted);border-color:#f3f3f2}
.ovp-root .rev-tab.idle:hover{background:#e9e9e8;border-color:#e0e0e0}
.ovp-root .rev-chart{height:160px}
.ovp-root .orders-flex{display:flex;gap:16px;align-items:center}
.ovp-root .orders-donut{width:118px;height:118px;position:relative;flex-shrink:0}
.ovp-root .orders-legend{font-size:11px}
.ovp-root .ol-item{display:flex;align-items:center;gap:7px;padding:3px 0;transition:.12s;border-radius:4px}
.ovp-root .ol-item:hover{background:#f9f9f9}
.ovp-root .ol-dot{width:7px;height:7px;border-radius:50%}
.ovp-root .cust-head{display:flex;justify-content:space-between;align-items:flex-start}
.ovp-root .cust-big{font-size:18px;font-weight:700}
.ovp-root .cust-growth{font-size:11px;color:var(--green);font-weight:600;display:flex;align-items:center;gap:2px}
.ovp-root .cust-sub{font-size:10px;color:var(--muted2)}
.ovp-root .cust-line{height:62px;margin:8px 0}
.ovp-root .cust-bottom{display:flex;gap:16px;margin-top:4px}
.ovp-root .cust-b b{font-size:13px}
.ovp-root .cat-row{display:flex;align-items:center;gap:10px;font-size:11px;margin-bottom:11px;transition:.15s;border-radius:6px;padding:2px 4px;margin-left:-4px}
.ovp-root .cat-row:hover{background:#f9f9f9}
.ovp-root .cat-name{width:88px;color:#222}
.ovp-root .cat-bar{flex:1;height:5px;background:#f0f0f0;border-radius:10px;overflow:hidden}
.ovp-root .cat-bar div{height:100%;background:var(--black);border-radius:10px;width:0;transition:width 1.2s cubic-bezier(.34,1.56,.64,1)}
.ovp-root .cat-val{width:74px;text-align:right;font-weight:600}
.ovp-root .quick{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-bottom:10px}
@media(max-width:1300px){.ovp-root .quick{grid-template-columns:repeat(4,1fr)}}
@media(max-width:600px){.ovp-root .quick{grid-template-columns:repeat(2,1fr)}}
.ovp-root .q-btn{height:36px;border:1px solid var(--border);background:var(--card);border-radius:10px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;font-weight:500;cursor:pointer;box-shadow:0 1px 1px rgba(0,0,0,0.02);transition:all .2s;position:relative;overflow:hidden}
.ovp-root .q-btn::before{content:'';position:absolute;inset:0;background:#111;transform:translateY(100%);transition:.22s;z-index:0}
.ovp-root .q-btn:hover{border-color:var(--black);transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,0.08);color:#fff}
.ovp-root .q-btn:hover::before{transform:translateY(0)}
.ovp-root .q-btn:hover svg{stroke:#fff}
.ovp-root .q-btn span, .ovp-root .q-btn svg{position:relative;z-index:1;transition:.18s}
.ovp-root .q-btn:active{transform:translateY(0)}
.ovp-root .q-btn svg{width:13px;height:13px}
.ovp-root .insights{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
@media(max-width:1300px){.ovp-root .insights{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.ovp-root .insights{grid-template-columns:1fr}}
.ovp-root .ins-card{border:1px solid var(--border-light);border-radius:11px;padding:11px;background:var(--card);display:flex;justify-content:space-between;gap:10px;align-items:flex-start;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:.22s;cursor:pointer;position:relative;overflow:hidden}
.ovp-root .ins-card::after{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--black);transform:scaleY(0);transition:.22s}
.ovp-root .ins-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,0.06);border-color:#ddd}
.ovp-root .ins-card:hover::after{transform:scaleY(1)}
.ovp-root .ins-left{display:flex;gap:9px;flex:1}
.ovp-root .ins-ico{width:26px;height:26px;background:#f8f8f7;border:1px solid #f0f0f0;border-radius:7px;display:grid;place-items:center;flex-shrink:0;transition:.18s}
.ovp-root .ins-card:hover .ins-ico{background:#111;border-color:#111}
.ovp-root .ins-card:hover .ins-ico svg{stroke:#fff}
.ovp-root .ins-ico svg{width:13px;height:13px;transition:.18s}
.ovp-root .ins-card b{font-size:11px;display:block;line-height:1.2}
.ovp-root .ins-card p{font-size:10.5px;color:var(--muted);margin-top:3px;line-height:1.35}
.ovp-root .ins-arrow{width:20px;height:20px;background:var(--black);color:#fff;border-radius:50%;display:grid;place-items:center;font-size:11px;flex-shrink:0;transition:.22s}
.ovp-root .ins-card:hover .ins-arrow{transform:translateX(4px) rotate(45deg)}
.ovp-root .ins-link{font-size:10px;font-weight:600;color:var(--black);white-space:nowrap;margin-top:2px;display:flex;align-items:center;gap:2px;transition:.15s}
.ovp-root .ins-link:hover{gap:5px}
.ovp-root .toast{position:fixed;bottom:20px;right:20px;background:#111;color:#fff;padding:11px 14px;border-radius:11px;font-size:12px;font-weight:500;box-shadow:0 10px 30px rgba(0,0,0,0.25);transform:translateY(100px) scale(0.9);opacity:0;transition:all .4s cubic-bezier(.34,1.56,.64,1);z-index:9999;display:flex;align-items:center;gap:8px;max-width:320px}
.ovp-root .toast.show{transform:translateY(0) scale(1);opacity:1}
.ovp-root .modal{position:fixed;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);display:none;place-items:center;z-index:10000;padding:20px}
.ovp-root .modal.show{display:grid;animation:ovpModalIn .25s ease}
@keyframes ovpModalIn{from{opacity:0}to{opacity:1}}
.ovp-root .modal-box{background:#fff;border-radius:16px;padding:20px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.2);animation:ovpBoxIn .35s cubic-bezier(.34,1.56,.64,1)}
@keyframes ovpBoxIn{from{transform:translateY(20px) scale(0.95);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
.ovp-root .modal-box h3{font-size:14px;font-weight:700;margin-bottom:6px}
.ovp-root .modal-box p{font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.5}
.ovp-root .modal-actions{display:flex;gap:8px;justify-content:flex-end}
.ovp-root .modal-actions button{padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:.15s;border:1px solid var(--border)}
.ovp-root .modal-actions .primary{background:#111;color:#fff;border-color:#111}
.ovp-root .modal-actions .primary:hover{background:#222}
.ovp-root .skeleton{background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:ovpShimmer 1.5s infinite}
@keyframes ovpShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.ovp-root .highlight{animation:ovpHighlight 1.5s ease}
@keyframes ovpHighlight{0%{background:#fef3c7}100%{background:transparent}}

.ovp-root .badge-cancel{background:#FEE2E2;color:#B91C1C;border-radius:20px;padding:3px 9px;font-size:10px;font-weight:700;display:inline-block;border:1px solid #FECACA}
.ovp-root a{text-decoration:none;color:inherit}
.ovp-root button{font-family:inherit}
.ovp-root input{font-family:inherit}
`;

const INK = '#111';

/* ── date helpers ─────────────────────────────────────────────────────────── */
const iso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const prettyDate = (ymd, withYear = false) => {
  const d = new Date(`${ymd}T00:00:00`);
  return d.toLocaleDateString('en-US', withYear
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric' });
};

const rangeLabel = (from, to) => `${prettyDate(from)} – ${prettyDate(to, true)}`;

const prevWindow = (from, to) => {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  const days = Math.max(1, Math.round((b - a) / 86400000) + 1);
  const prevTo = new Date(a); prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: iso(prevFrom), to: iso(prevTo), days };
};

const baselineWindow = (from, to, mode) => {
  if (mode === 'none') return null;
  if (mode === 'prev7') {
    const t = new Date(`${from}T00:00:00`); t.setDate(t.getDate() - 1);
    const f = new Date(t); f.setDate(f.getDate() - 6);
    return { from: iso(f), to: iso(t) };
  }
  if (mode === 'prev30') {
    const t = new Date(`${from}T00:00:00`); t.setDate(t.getDate() - 1);
    const f = new Date(t); f.setDate(f.getDate() - 29);
    return { from: iso(f), to: iso(t) };
  }
  if (mode === 'year') {
    const f = new Date(`${from}T00:00:00`); f.setFullYear(f.getFullYear() - 1);
    const t = new Date(`${to}T00:00:00`); t.setFullYear(t.getFullYear() - 1);
    return { from: iso(f), to: iso(t) };
  }
  return prevWindow(from, to);
};

const rs = (n, digits = 2) =>
  `Rs ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const initials = (name) =>
  String(name || 'C').split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

function payTone(o) {
  const pay = String(o.paymentStatus || o.paymentState || '');
  const st = String(o.status || '');
  if (['Paid', 'Verified', 'Confirmed'].includes(pay) || st === 'Delivered') return { label: 'Paid', cls: 'badge-paid' };
  if (pay === 'Pending' || st === 'Pending' || st === 'Confirmed') return { label: 'Pending', cls: 'badge-pending' };
  return { label: st || 'Open', cls: 'badge-cancel' };
}

/* ── count-up, same easing as the reference (cubic-out, 1.2s) ─────────────── */
function CountUp({ value, prefix = '', suffix = '', decimals = 0, delay = 0 }) {
  const [shown, setShown] = useState(prefix + '0' + suffix);
  const raf = useRef(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const dur = 1200;
    let t0 = null;
    const fmt = (n) => prefix + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    const step = (now) => {
      if (t0 === null) t0 = now;
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(p < 1 ? fmt(target * eased) : fmt(target));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    const timer = setTimeout(() => { raf.current = requestAnimationFrame(step); }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf.current); };
  }, [value, prefix, suffix, decimals, delay]);
  return <>{shown}</>;
}

/* ── Chart.js canvas bound to React (reference configs, live data) ────────── */
function ChartBox({ build, deps, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    const chart = new Chart(ref.current, build());
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <canvas ref={ref} className={className} />;
}

const TOOLTIP = { backgroundColor: '#111', titleFont: { size: 11 }, bodyFont: { size: 11 }, padding: 8, cornerRadius: 8, displayColors: false };
const AXIS_TICK = { font: { size: 10 }, color: '#9ca3af' };
const kFmt = (v) => `Rs ${Math.round(v / 1000)}K`;

class ChartBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error('Chart render error:', e); }
  render() {
    if (this.state.failed) {
      return (
        <div className="card-t" role="alert" style={{ padding: '20px 0', color: '#6b7280' }}>
          Couldn&apos;t render this chart — <button type="button" className="btn-sm" onClick={() => this.setState({ failed: false })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── quick actions / add-new / compare — real admin routes ────────────────── */
const QUICK = [
  { to: '/admin/orders/new', label: 'Create Order', d: <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14h6M12 11v6" /></> },
  { to: '/admin/products/new', label: 'Add Product', d: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></> },
  { to: '/admin/discounts', label: 'Add Discount', d: <><path d="M20 12V8H6a2 2 0 0 1 2-2c0-1.1.9-2 2-2a2 2 0 0 1 2 2c0-1.1.9-2 2-2a2 2 0 0 1 2 2c0-1.1.9-2 2-2a2 2 0 0 1 2 2v4" /><path d="M20 12v4H6a2 2 0 0 0-2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0 1.1.9 2 2 2a2 2 0 0 0 2-2v-4" /><circle cx="12" cy="12" r="2" /></> },
  { to: '/admin/collections', label: 'Create Collection', d: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></> },
  { to: '/admin/email-campaigns', label: 'Send Email', d: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></> },
  { to: '/admin/reports', label: 'View Reports', d: <><path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 6-6" /></> },
  { to: '/admin/products?stock=low', label: 'Inventory Alert', d: <><path d="M6 8a6 6 0 0 1 12 0c0 7 6 5 6 10H0s6-3 6-10" /><path d="M10 20a2 2 0 0 0 4 0" /></> },
  { to: '/admin/questions', label: 'Support Ticket', d: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /> },
];

const COMPARE_OPTIONS = [
  { key: 'prev7', label: 'Previous 7 days' },
  { key: 'prev30', label: 'Previous 30 days' },
  { key: 'year', label: 'Same period last year' },
  { key: 'none', label: 'No comparison' },
];

const RANGE_OPTIONS = [
  { key: '7d', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
  { key: '30d', label: 'Last 30 Days' },
];

/* ── the page ─────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { auth, logout } = useApp();
  const nav = useNavigate();

  const [d, setD] = useState(null);
  const [prev, setPrev] = useState(null);
  const [live, setLive] = useState(null);
  const [trending, setTrending] = useState([]);
  const [cats, setCats] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [insights, setInsights] = useState(null);
  const [smart, setSmart] = useState([]);
  const [abandoned, setAbandoned] = useState(null);
  const [err, setErr] = useState('');

  const [compare, setCompare] = useState('prev7');
  const [revTab, setRevTab] = useState('revenue');
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState('');
  const [dateOpen, setDateOpen] = useState(false);
  const [cmpOpen, setCmpOpen] = useState(false);
  const [weekOpen, setWeekOpen] = useState(false);
  const [revOpen, setRevOpen] = useState(false);
  const [badgeHidden, setBadgeHidden] = useState(false);
  const [fs, setFs] = useState(false);
  const [barsIn, setBarsIn] = useState(false);

  const toastTimer = useRef(0);

  const [range, setRange] = useState(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const fromQ = sp.get('from'); const toQ = sp.get('to');
      if (fromQ && toQ) return { preset: 'custom', from: fromQ, to: toQ };
      const saved = JSON.parse(localStorage.getItem('hushae.dashRange') || 'null');
      if (saved?.preset && saved.preset !== 'custom') {
        const r = resolvePreset(saved.preset);
        if (r) return { preset: saved.preset, from: r.from, to: r.to };
      }
      if (saved?.preset === 'custom' && saved.from && saved.to) return saved;
    } catch { /* ignore */ }
    const r = resolvePreset('7d');
    return { preset: '7d', from: r.from, to: r.to };
  });

  const say = useCallback((msg) => {
    if (!msg) return;
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const applyRange = useCallback((r) => {
    if (!r?.from || !r?.to) return;
    setRange(r);
    try { localStorage.setItem('hushae.dashRange', JSON.stringify(r)); } catch { /* ignore */ }
    const sp = new URLSearchParams(window.location.search);
    if (r.preset === 'custom') { sp.set('from', r.from); sp.set('to', r.to); }
    else { sp.delete('from'); sp.delete('to'); }
    const qs = sp.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, []);

  const onWeek = (key) => {
    const r = resolvePreset(key);
    if (r) applyRange({ preset: key, from: r.from, to: r.to });
  };

  const pw = useMemo(() => baselineWindow(range.from, range.to, compare), [range.from, range.to, compare]);

  const load = useCallback(async (silent = false) => {
    try {
      const qs = `from=${range.from}&to=${range.to}`;
      const prevQs = pw ? `from=${pw.from}&to=${pw.to}` : null;
      const token = auth?.token;
      const [data, prevData, liveData, trend, catData, cust, ins, sm, carts] = await Promise.all([
        api(`/admin/dashboard?${qs}`, { token }),
        prevQs ? api(`/admin/dashboard?${prevQs}`, { token }).catch(() => null) : Promise.resolve(null),
        api('/track/admin/live', { token }).catch(() => null),
        // both are public GETs, memory-cached 2 min — key must move with the range
        api(`/products/trending?limit=5&days=30&_t=${range.from}_${range.to}`, { token }).catch(() => null),
        api(`/categories?all=1&_t=${range.from}_${range.to}`).catch(() => null),
        api('/admin/customers', { token }).catch(() => null),
        api(`/orders/insights/dashboard?${qs}`, { token }).catch(() => null),
        api('/dashboard/insights', { token }).catch(() => null),
        api('/abandoned-cart/admin?status=open', { token }).catch(() => null),
      ]);
      setD(data);
      setPrev(prevData);
      setLive(liveData);
      setTrending(trend?.products || []);
      setCats(catData?.categories || []);
      setCustomers(cust?.customers || []);
      setInsights(ins);
      setSmart(sm?.insights || []);
      setAbandoned(carts);
      setErr('');
    } catch (e) {
      if (e?.status === 401) { logout(); return; }
      if (!silent) setErr('Failed to load dashboard.');
    }
  }, [auth, range.from, range.to, pw, logout]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!auth?.token) return undefined;
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [auth, load]);

  /* reference behaviour: click outside a pill closes every dropdown */
  useEffect(() => {
    const onDoc = (e) => {
      if (!e.target.closest?.('.pill')) { setDateOpen(false); setCmpOpen(false); setWeekOpen(false); setRevOpen(false); }
    };
    const onEsc = (e) => { if (e.key === 'Escape') { setDateOpen(false); setCmpOpen(false); setWeekOpen(false); setRevOpen(false); setModal(''); } };
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = modal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modal]);

  /* reference category-bar entrance animation */
  useEffect(() => {
    const t = setTimeout(() => setBarsIn(true), 600);
    return () => clearTimeout(t);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => say('Fullscreen ON'))
        .catch(() => say('Fullscreen not supported'));
    } else {
      document.exitFullscreen().catch(() => {});
      say('Fullscreen OFF');
    }
  };

  /* ── derived ──────────────────────────────────────────────────────────── */
  const vsLabel = pw ? `vs ${prettyDate(pw.from)} – ${prettyDate(pw.to)}` : 'no comparison';

  const chart = useMemo(() => {
    const cur = d?.chart || [];
    const prv = prev?.chart || [];
    return cur.map((row, i) => ({
      ...row,
      label: prettyDate(row.date || row.label),
      prevRevenue: prv[i]?.revenue ?? null,
    }));
  }, [d, prev]);

  const sparkRev = chart.map((x) => x.revenue || 0);
  const sparkOrd = chart.map((x) => x.orders || 0);
  const sparkCust = chart.map((x) => x.customers || 0);
  const sparkAov = chart.map((x) => (x.orders ? (x.revenue || 0) / x.orders : 0));

  const sessions = live?.today?.sessions || 0;
  const conversion = sessions > 0 ? ((live?.today?.orders || 0) / sessions) * 100 : 0;

  const topProducts = (trending.length ? trending : (d?.bestSellers || [])).slice(0, 5).map((p) => ({
    id: p._id || p.slug || p.name,
    name: p.name,
    qty: p.unitsSold ?? p.qty ?? 0,
    revenue: p.revenue || 0,
    image: p.images?.[0]?.url || p.image || '',
    slug: p.categorySlug || '',
  }));

  const catName = useCallback((slug) => cats.find((c) => c.slug === slug)?.name || slug || 'Collection', [cats]);

  const catBars = useMemo(() => {
    const map = new Map();
    topProducts.forEach((p) => {
      const key = p.slug || 'other';
      const cur = map.get(key) || { slug: key, name: catName(key), revenue: 0 };
      cur.revenue += Number(p.revenue) || 0;
      map.set(key, cur);
    });
    const rows = [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const max = Math.max(1, ...rows.map((r) => r.revenue));
    return rows.map((r) => ({ ...r, pct: (r.revenue / max) * 100 }));
  }, [topProducts, catName]);

  const channels = useMemo(() => {
    const total = d?.kpis?.revenue?.value || 0;
    const devices = live?.byDevice || [];
    const sum = devices.reduce((n, x) => n + (x.sessions || 0), 0) || 1;
    const labelOf = (dev) => (dev === 'mobile' ? 'Mobile' : dev === 'tablet' ? 'Tablet' : 'Online Store');
    if (!devices.length || total <= 0) return [{ name: 'Online Store', pct: 100, amount: total, color: '#111' }];
    return devices
      .map((x) => ({ name: labelOf(x.device), pct: (x.sessions / sum) * 100, amount: total * (x.sessions / sum) }))
      .sort((a, b) => b.pct - a.pct);
  }, [live, d]);
  const CHANNEL_COLORS = ['#111', '#555', '#8a8a8a', '#d6d6d6'];

  const statusMix = useMemo(() => {
    const s = d?.stats || {};
    const processing = (s.confirmed || 0) + (s.processing || 0) + (s.readyToShip || 0) + (s.shipped || 0);
    const rows = [
      { name: 'Delivered', value: s.delivered || 0, color: '#111' },
      { name: 'Processing', value: processing, color: '#6b7280' },
      { name: 'Pending', value: s.pending || 0, color: '#b5b5b5' },
      { name: 'Cancelled', value: s.cancelled || 0, color: '#e5e7eb' },
    ].filter((x) => x.value > 0);
    const total = rows.reduce((n, x) => n + x.value, 0) || (d?.kpis?.orders?.value || 0);
    return { total, rows: rows.map((x) => ({ ...x, pct: total ? (x.value / total) * 100 : 0 })) };
  }, [d]);

  const topPages = useMemo(() => {
    const feed = live?.feed || [];
    const map = new Map();
    feed.forEach((e) => { const p = e.path || '/'; map.set(p, (map.get(p) || 0) + 1); });
    const rows = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (rows.length) return rows.map(([path, n]) => ({ path, n }));
    return [{ path: '/', n: live?.visitorsNow || 0 }];
  }, [live]);

  const hourly = d?.hourly || [];
  const todayOrders = hourly.reduce((n, h) => n + (h.orders || 0), 0);
  const pendingPay = insights?.paymentBreakdown?.Pending || 0;
  const lowStock = d?.lowStock || [];
  const lowStockN = lowStock.length;
  const alerts = todayOrders + pendingPay + lowStockN;

  const totalCustomers = customers.length || d?.kpis?.customers?.value || 0;
  const returning = customers.filter((c) => (c.orders || 0) > 1).length;
  const peakDay = chart.reduce((best, row) => ((row.revenue || 0) > (best?.revenue || 0) ? row : best), null);

  const recentOrders = (d?.recentOrders || []).slice(0, 5).map((o) => ({
    id: o._id,
    num: o.orderNumber,
    name: o.customerInfo?.name || 'Customer',
    total: o.total,
    tone: payTone(o),
  }));

  /* reference search filters both desk tables */
  const needle = q.trim().toLowerCase();
  const prodRows = needle ? topProducts.filter((p) => p.name.toLowerCase().includes(needle)) : topProducts;
  const orderRows = needle
    ? recentOrders.filter((o) => `${o.num} ${o.name}`.toLowerCase().includes(needle))
    : recentOrders;
  const onSearch = (e) => {
    setQ(e.target.value);
    if (e.key === 'Enter' && e.target.value.trim()) {
      say(prodRows.length + orderRows.length
        ? `${prodRows.length + orderRows.length} match${prodRows.length + orderRows.length === 1 ? '' : 'es'} on this page`
        : 'No match on this page');
    }
  };

  const k = d?.kpis || {};
  const revData = chart.map((row) => ({ day: row.label, revenue: row.revenue || 0, orders: row.orders || 0 }));

  const insightCards = [
    {
      title: 'High Demand',
      body: smart.find((x) => x.id === 'product-momentum')?.text
        || (topProducts[0] ? `“${topProducts[0].name}” is leading units sold this period.` : 'Sales momentum appears once orders land.'),
      to: '/admin/products', arrow: true,
      ico: <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.3L12 16.5 5.8 21l2.4-7.3L2 9.2h7.6z" />,
    },
    {
      title: 'Low Stock',
      body: lowStockN > 0
        ? `${lowStockN} product${lowStockN === 1 ? '' : 's'} ${lowStockN === 1 ? 'is' : 'are'} running low on stock.`
        : 'All tracked products are stocked.',
      to: '/admin/products?stock=low', cta: lowStockN ? 'View products →' : '',
      ico: <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14l2 2 4-4" /></>,
    },
    {
      title: 'Abandoned Carts',
      body: abandoned?.stats?.openCount
        ? `${abandoned.stats.openCount} cart${abandoned.stats.openCount === 1 ? '' : 's'} are pending recovery.`
        : 'No open carts waiting for recovery.',
      to: '/admin/abandoned-carts', cta: abandoned?.stats?.openCount ? 'Recover now →' : '',
      ico: <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></>,
    },
    {
      title: 'Best Selling Day',
      body: peakDay && (peakDay.revenue || 0) > 0
        ? `${peakDay.label} generated the highest sales.`
        : 'Best day appears once the period has orders.',
      to: '/admin/analytics', bars: true,
      ico: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    },
    {
      title: 'Conversion Boost',
      body: sessions
        ? `Your conversion rate is ${conversion.toFixed(2)}% today from ${sessions} session${sessions === 1 ? '' : 's'}.`
        : 'Conversion appears once storefront traffic is tracked.',
      to: '/admin/live', arrow: true,
      ico: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
    },
  ];

  /* ── shells ───────────────────────────────────────────────────────────── */
  const shell = (children) => (
    <AdminLayout title="Overview" subtitle="Here's what's happening with your store today." hideContentTitle chromeless>
      <style>{OVP_CSS}</style>
      <div className="ovp-root">
        {children}
      </div>
    </AdminLayout>
  );

  if (err) {
    return shell(
      <div className="wrap">
        <div className="card" style={{ maxWidth: 420, margin: '40px auto', textAlign: 'center' }}>
          <p className="card-t" style={{ justifyContent: 'center' }}>{err}</p>
          <div className="modal-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="primary" onClick={() => { setErr(''); load(); }}>Try again</button>
          </div>
        </div>
      </div>,
    );
  }

  if (!d) {
    return shell(
      <div className="wrap">
        <div className="skeleton" style={{ height: 52, borderRadius: 10, marginBottom: 16 }} />
        <div className="stats">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: 104, borderRadius: 12 }} />)}
        </div>
        <div className="skeleton" style={{ height: 268, borderRadius: 12 }} />
      </div>,
    );
  }

  return shell(
    <div className="wrap">
      {/* ── topbar ──────────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="top-left">
          <button type="button" className="hamburger" aria-label="Open navigation menu" onClick={() => window.dispatchEvent(new Event('ovp-menu'))}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <div className="top-title"><h1>Overview</h1><p>Here&apos;s what&apos;s happening with your store today.</p></div>
        </div>
        <div className="top-right">
          <div className="search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={onSearch} onKeyUp={onSearch} placeholder="Search orders, products, customers..." aria-label="Search orders, products and customers on this page" />
            <span className="kbd">⌘ K</span>
          </div>

          <div className={`pill ${dateOpen ? 'active' : ''}`} onClick={() => setDateOpen((v) => !v)}>
            <span>{rangeLabel(range.from, range.to)}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            <div className={`dropdown ${dateOpen ? 'show' : ''}`}>
              {RANGE_OPTIONS.map((o) => {
                const r = resolvePreset(o.key);
                return (
                  <div key={o.key} onClick={(e) => { e.stopPropagation(); onWeek(o.key); setDateOpen(false); say(`Date changed to ${rangeLabel(r.from, r.to)}`); }}>
                    {o.label} · {r ? rangeLabel(r.from, r.to) : ''}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`pill ${cmpOpen ? 'active' : ''}`} onClick={() => setCmpOpen((v) => !v)}>
            <span>Compare: {COMPARE_OPTIONS.find((o) => o.key === compare)?.label}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
            <div className={`dropdown ${cmpOpen ? 'show' : ''}`}>
              {COMPARE_OPTIONS.map((o) => (
                <div key={o.key} onClick={(e) => { e.stopPropagation(); setCompare(o.key); setCmpOpen(false); say(`Comparison: ${o.label}`); }}>
                  {o.label}
                </div>
              ))}
            </div>
          </div>

          <button type="button" className="btn-black" onClick={() => setModal('addModal')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg> Add New
          </button>

          <button type="button" className="icon-btn" title="Alerts & verification queue" onClick={() => setModal('notifModal')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 7 6 5 6 10H0s6-3 6-10" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
            {alerts > 0 && !badgeHidden && <span className="badge">{alerts}</span>}
          </button>

          <button type="button" className="icon-btn" title={fs ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
          </button>
        </div>
      </div>

      {/* ── KPI stats ───────────────────────────────────────────────────── */}
      <div className="stats">
        <div className="stat" onClick={() => say(`Total Sales: ${rs(k.revenue?.value || 0)} — ${vsLabel}`)}>
          <div className="stat-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> Total Sales</div>
          <div className="stat-val"><CountUp value={k.revenue?.value || 0} prefix="Rs " decimals={2} delay={200} /></div>
          <div className="stat-foot">
            <div>
              {typeof k.revenue?.change === 'number' && (
                <div className="stat-change" style={k.revenue.change < 0 ? { color: '#dc2626' } : undefined}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={k.revenue.change < 0 ? { transform: 'rotate(180deg)' } : undefined}><path d="M12 19V5M5 12l7-7 7 7" /></svg> {Math.abs(k.revenue.change).toFixed(1)}%
                </div>
              )}
              <div className="stat-vs">{vsLabel}</div>
            </div>
            <ChartBoundary><div className="spark"><ChartBox deps={[sparkRev.join(',')]} build={() => ({
              type: 'line',
              data: { labels: sparkRev.map((_, i) => i), datasets: [{ data: sparkRev, borderColor: '#111', borderWidth: 1.4, pointRadius: 0, tension: 0.4, fill: false }] },
              options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { point: { radius: 0 } }, animation: { duration: 1000, easing: 'easeOutQuart' } },
            })} /></div></ChartBoundary>
          </div>
        </div>

        <div className="stat" onClick={() => say(`Orders: ${(k.orders?.value || 0).toLocaleString()}`)}>
          <div className="stat-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg> Orders</div>
          <div className="stat-val"><CountUp value={k.orders?.value || 0} delay={280} /></div>
          <div className="stat-foot">
            <div>
              {typeof k.orders?.change === 'number' && (
                <div className="stat-change"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> {Math.abs(k.orders.change).toFixed(1)}%</div>
              )}
              <div className="stat-vs">{vsLabel}</div>
            </div>
            <ChartBoundary><div className="spark"><ChartBox deps={[sparkOrd.join(',')]} build={() => ({
              type: 'line',
              data: { labels: sparkOrd.map((_, i) => i), datasets: [{ data: sparkOrd, borderColor: '#111', borderWidth: 1.4, pointRadius: 0, tension: 0.4, fill: false }] },
              options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { point: { radius: 0 } }, animation: { duration: 1000, easing: 'easeOutQuart' } },
            })} /></div></ChartBoundary>
          </div>
        </div>

        <div className="stat" onClick={() => say(`Customers: ${(k.customers?.value || 0).toLocaleString()}`)}>
          <div className="stat-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> Customers</div>
          <div className="stat-val"><CountUp value={k.customers?.value || 0} delay={360} /></div>
          <div className="stat-foot">
            <div>
              {typeof k.customers?.change === 'number' && (
                <div className="stat-change"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> {Math.abs(k.customers.change).toFixed(1)}%</div>
              )}
              <div className="stat-vs">{vsLabel}</div>
            </div>
            <ChartBoundary><div className="spark"><ChartBox deps={[sparkCust.join(',')]} build={() => ({
              type: 'line',
              data: { labels: sparkCust.map((_, i) => i), datasets: [{ data: sparkCust, borderColor: '#111', borderWidth: 1.4, pointRadius: 0, tension: 0.4, fill: false }] },
              options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { point: { radius: 0 } }, animation: { duration: 1000, easing: 'easeOutQuart' } },
            })} /></div></ChartBoundary>
          </div>
        </div>

        <div className="stat">
          <div className="stat-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> Avg. Order Value</div>
          <div className="stat-val"><CountUp value={k.aov?.value || 0} prefix="Rs " decimals={2} delay={440} /></div>
          <div className="stat-foot">
            <div>
              {typeof k.aov?.change === 'number' && (
                <div className="stat-change"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> {Math.abs(k.aov.change).toFixed(1)}%</div>
              )}
              <div className="stat-vs">{vsLabel}</div>
            </div>
            <ChartBoundary><div className="spark"><ChartBox deps={[sparkAov.join(',')]} build={() => ({
              type: 'line',
              data: { labels: sparkAov.map((_, i) => i), datasets: [{ data: sparkAov, borderColor: '#111', borderWidth: 1.4, pointRadius: 0, tension: 0.4, fill: false }] },
              options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { point: { radius: 0 } }, animation: { duration: 1000, easing: 'easeOutQuart' } },
            })} /></div></ChartBoundary>
          </div>
        </div>

        <div className="stat">
          <div className="stat-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg> Conversion Rate</div>
          <div className="stat-val"><CountUp value={conversion} suffix="%" decimals={2} delay={520} /></div>
          <div className="stat-foot">
            <div>
              <div className="stat-vs">{sessions ? `${sessions} sessions today` : 'storefront traffic'}</div>
            </div>
            <ChartBoundary><div className="spark"><ChartBox deps={[sparkOrd.join(',')]} build={() => ({
              type: 'line',
              data: { labels: sparkOrd.map((_, i) => i), datasets: [{ data: sparkOrd, borderColor: '#111', borderWidth: 1.4, pointRadius: 0, tension: 0.4, fill: false }] },
              options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { point: { radius: 0 } }, animation: { duration: 1000, easing: 'easeOutQuart' } },
            })} /></div></ChartBoundary>
          </div>
        </div>

        <div className="stat">
          <div className="stat-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg> Net Profit</div>
          <div className="stat-val"><CountUp value={k.profit?.value || 0} prefix="Rs " decimals={2} delay={600} /></div>
          <div className="stat-foot">
            <div>
              {typeof k.profit?.change === 'number' && (
                <div className="stat-change"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> {Math.abs(k.profit.change).toFixed(1)}%</div>
              )}
              <div className="stat-vs">{vsLabel}</div>
            </div>
            <ChartBoundary><div className="spark"><ChartBox deps={[sparkRev.join(',')]} build={() => ({
              type: 'line',
              data: { labels: sparkRev.map((_, i) => i), datasets: [{ data: sparkRev, borderColor: '#111', borderWidth: 1.4, pointRadius: 0, tension: 0.4, fill: false }] },
              options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { point: { radius: 0 } }, animation: { duration: 1000, easing: 'easeOutQuart' } },
            })} /></div></ChartBoundary>
          </div>
        </div>
      </div>

      {/* ── sales overview / channel / live ─────────────────────────────── */}
      <div className="grid3">
        <div className="card">
          <div className="card-h">
            <div className="card-t">Sales Overview <span className="info" title="This period vs the selected comparison window" onClick={() => say(`Sales comparison: ${vsLabel}`)}>i</span></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn-sm pill" style={{ position: 'relative' }} onClick={() => setWeekOpen((v) => !v)}>
                {RANGE_OPTIONS.find((o) => o.key === (range.preset === 'custom' ? '7d' : range.preset))?.label || 'This Week'} ▾
                <div className={`dropdown ${weekOpen ? 'show' : ''}`} style={{ right: 0, left: 'auto' }}>
                  {RANGE_OPTIONS.map((o) => <div key={o.key} onClick={(e) => { e.stopPropagation(); onWeek(o.key); setWeekOpen(false); }}>{o.label}</div>)}
                </div>
              </button>
              <button type="button" className="btn-sm" onClick={() => { load(true); say('Chart refreshed'); }}>⋮</button>
            </div>
          </div>
          <div className="legend">
            <span><b style={{ background: '#111' }}></b> This Period</span>
            {pw && <span><b style={{ background: '#c8c8c8' }}></b> Previous Period</span>}
          </div>
          <div className="chart-main">
            <ChartBoundary>
              <ChartBox deps={[chart.map((c) => c.revenue).join(','), chart.map((c) => c.prevRevenue).join(',')]} build={() => ({
                type: 'line',
                data: {
                  labels: chart.map((c) => c.label),
                  datasets: [
                    { label: 'This Period', data: chart.map((c) => c.revenue || 0), borderColor: '#111', backgroundColor: '#111', borderWidth: 2.2, tension: 0.35, pointRadius: 4, pointBackgroundColor: '#111', pointBorderWidth: 2, pointHoverRadius: 6 },
                    ...(pw ? [{ label: 'Previous Period', data: chart.map((c) => c.prevRevenue), borderColor: '#c8c8c8', backgroundColor: '#c8c8c8', borderWidth: 1.5, borderDash: [4, 4], tension: 0.35, pointRadius: 0, spanGaps: true }] : []),
                  ],
                },
                options: {
                  responsive: true, maintainAspectRatio: false,
                  animation: { duration: 1400, easing: 'easeOutQuart' },
                  plugins: { legend: { display: false }, tooltip: { ...TOOLTIP, callbacks: { label: (c) => `${c.dataset.label}: ${rs(c.parsed.y, 0)}` } } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: '#f2f2f2', borderDash: [3, 3] }, ticks: { ...AXIS_TICK, callback: kFmt }, border: { display: false } },
                    x: { grid: { display: false }, ticks: AXIS_TICK, border: { display: false } },
                  },
                },
              })} />
            </ChartBoundary>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><span className="card-t">Sales by Channel</span></div>
          <div className="donut-row">
            <div className="donut">
              <ChartBoundary>
                <ChartBox deps={[channels.map((c) => c.amount).join(',')]} build={() => ({
                  type: 'doughnut',
                  data: { labels: channels.map((c) => c.name), datasets: [{ data: channels.map((c) => c.amount), backgroundColor: channels.map((c, i) => c.color || CHANNEL_COLORS[i % 4]), borderWidth: 0, hoverOffset: 5 }] },
                  options: { cutout: '70%', animation: { animateRotate: true, duration: 1300, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: { ...TOOLTIP, callbacks: { label: (c) => ` ${c.label}: ${rs(c.parsed, 0)}` } } }, responsive: true, maintainAspectRatio: false },
                })} />
              </ChartBoundary>
              <div className="donut-center"><b>{rs(k.revenue?.value || 0)}</b><span>Total Sales</span></div>
            </div>
            <div className="ch-list">
              {channels.map((c, i) => (
                <div className="ch-item" key={c.name}>
                  <div className="dot" style={{ background: c.color || CHANNEL_COLORS[i % 4] }}></div> {c.name}
                  <span className="pct">{c.pct.toFixed(1)}%</span>
                  <span className="val">{rs(c.amount, 0)}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right', marginTop: 14 }}>
            <Link to="/admin/analytics" className="btn-sm">View full report</Link>
          </div>
        </div>

        <div className="card">
          <div className="live-top">
            <span className="card-t">Live Visitors</span>
            <span style={{ fontSize: 10, color: '#0e9f6e', display: 'flex', alignItems: 'center', gap: 5 }}><span className="live-dot"></span> Live</span>
          </div>
          <div className="live-num">{live?.visitorsNow ?? 0}</div>
          <div className="live-sub">Visitors right now</div>
          <LiveBars />
          <div className="pages">
            <div className="page-row head"><span>Top Pages</span><span></span></div>
            {topPages.map((p) => (
              <div className="page-row" key={p.path}><span>{p.path}</span><span>{p.n}</span></div>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <Link to="/admin/live" className="btn-sm" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>View real time</Link>
          </div>
        </div>
      </div>

      {/* ── glance / products / orders ──────────────────────────────────── */}
      <div className="grid4">
        <div className="card">
          <div className="card-h"><span className="card-t">Today at a Glance</span></div>
          <div className="glance">
            <Link className="g-item" to="/admin/orders">
              <div className="g-ico"><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" /></svg></div>
              <b>{todayOrders}</b><span>New Orders</span>
            </Link>
            <Link className="g-item" to="/admin/verification-queue">
              <div className="g-ico"><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M12 8v4l3 3" /></svg></div>
              <b>{pendingPay}</b><span>Pending Payments</span>
            </Link>
            <Link className="g-item" to="/admin/products?stock=low">
              <div className="g-ico"><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg></div>
              <b>{lowStockN}</b><span>Low Stock Alerts</span>
            </Link>
            <Link className="g-item" to="/admin/customers">
              <div className="g-ico"><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><circle cx="12" cy="7" r="3" /><path d="M5 21v-2a5 5 0 0 1 10 0v2" /><circle cx="18" cy="10" r="2" /><path d="M20 21v-1a3 3 0 0 0-3-3" /></svg></div>
              <b>{k.customers?.value || 0}</b><span>New Customers</span>
            </Link>
          </div>
          <Link className="view-all" to="/admin/verification-queue">View all notifications <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
        </div>

        <div className="card">
          <div className="card-h"><span className="card-t">Top Selling Products</span><Link to="/admin/products" style={{ fontSize: 10.5, color: '#6b7280' }}>View all</Link></div>
          {prodRows.length === 0 ? (
            <p style={{ padding: '24px 0', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
              {needle ? 'No product matches this search.' : 'Product sales appear once orders land.'}
            </p>
          ) : (
            <table className="tbl">
              <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
              <tbody>
                {prodRows.map((p) => (
                  <tr key={p.id} className={needle ? 'highlight' : ''}>
                    <td>
                      <Link to="/admin/products" className="prod">
                        <span className="prod-ico" style={{ overflow: 'hidden' }}>
                          {p.image
                            ? <Img src={p.image} alt="" width={44} height={44} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.5"><path d="M5 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z" /><path d="M5 8l2-3h10l2 3" /><path d="M12 12a2 2 0 0 0 0 4 2 2 0 0 0 0-4z" /></svg>}
                        </span> {p.name}
                      </Link>
                    </td>
                    <td>{Number(p.qty || 0).toLocaleString()}</td>
                    <td>{rs(p.revenue, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-h"><span className="card-t">Recent Orders</span><Link to="/admin/orders" style={{ fontSize: 10.5, color: '#6b7280' }}>View all</Link></div>
          {orderRows.length === 0 ? (
            <p style={{ padding: '24px 0', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
              {needle ? 'No order matches this search.' : 'No orders in this period.'}
            </p>
          ) : (
            <table className="tbl">
              <tbody>
                {orderRows.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/admin/orders/${o.id}`} className="prod">
                        <span className="prod-ico" style={{ background: '#f0f0f0', fontSize: 9, fontWeight: 700 }}>{initials(o.name)}</span> {o.num}
                      </Link>
                    </td>
                    <td><Link to={`/admin/orders/${o.id}`}>{o.name}</Link></td>
                    <td>{rs(o.total)}</td>
                    <td><span className={o.tone.cls}>{o.tone.label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── revenue / status / customers / categories ───────────────────── */}
      <div className="grid4b">
        <div className="card">
          <div className="card-h">
            <span className="card-t">Revenue &amp; Orders</span>
            <button type="button" className="btn-sm pill" style={{ position: 'relative' }} onClick={() => setRevOpen((v) => !v)}>
              {RANGE_OPTIONS.find((o) => o.key === (range.preset === 'custom' ? '7d' : range.preset))?.label || 'This Week'} ▾
              <div className={`dropdown ${revOpen ? 'show' : ''}`} style={{ right: 0, left: 'auto' }}>
                {RANGE_OPTIONS.map((o) => <div key={o.key} onClick={(e) => { e.stopPropagation(); onWeek(o.key); setRevOpen(false); }}>{o.label}</div>)}
              </div>
            </button>
          </div>
          <div className="rev-tabs">
            <button type="button" className={`rev-tab ${revTab === 'revenue' ? 'active' : 'idle'}`} onClick={() => { setRevTab('revenue'); say('Switched to Revenue'); }}>Revenue</button>
            <button type="button" className={`rev-tab ${revTab === 'orders' ? 'active' : 'idle'}`} onClick={() => { setRevTab('orders'); say('Switched to Orders'); }}>Orders</button>
            {typeof (revTab === 'revenue' ? k.revenue?.change : k.orders?.change) === 'number' && (
              <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> {Math.abs(revTab === 'revenue' ? k.revenue.change : k.orders.change).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="rev-chart">
            <ChartBoundary>
              <ChartBox deps={[revTab, revData.map((r) => r.revenue).join(','), revData.map((r) => r.orders).join(',')]} build={() => ({
                type: 'bar',
                data: {
                  labels: revData.map((r) => r.day),
                  datasets: [{
                    data: revData.map((r) => (revTab === 'revenue' ? r.revenue : r.orders)),
                    backgroundColor: revTab === 'revenue' ? '#111' : '#555',
                    borderRadius: { topLeft: 4, topRight: 4 },
                    barThickness: 18,
                    hoverBackgroundColor: '#222',
                  }],
                },
                options: {
                  responsive: true, maintainAspectRatio: false,
                  animation: { duration: 1200, easing: 'easeOutQuart' },
                  plugins: { legend: { display: false }, tooltip: { ...TOOLTIP, callbacks: { label: (c) => (revTab === 'revenue' ? rs(c.parsed.y, 0) : `${c.parsed.y} orders`) } } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: '#f5f5f5' }, ticks: { ...AXIS_TICK, callback: revTab === 'revenue' ? kFmt : undefined }, border: { display: false } },
                    y1: { position: 'right', beginAtZero: true, suggestedMax: Math.max(10, ...revData.map((r) => r.orders)), grid: { display: false }, ticks: AXIS_TICK, border: { display: false } },
                    x: { grid: { display: false }, ticks: AXIS_TICK, border: { display: false } },
                  },
                },
              })} />
            </ChartBoundary>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><span className="card-t">Orders Status</span></div>
          <div className="orders-flex">
            <div className="orders-donut">
              <ChartBoundary>
                <ChartBox deps={[statusMix.rows.map((r) => r.value).join(',')]} build={() => ({
                  type: 'doughnut',
                  data: { labels: statusMix.rows.map((r) => r.name), datasets: [{ data: statusMix.rows.length ? statusMix.rows.map((r) => r.value) : [1], backgroundColor: statusMix.rows.length ? statusMix.rows.map((r) => r.color) : ['#e5e7eb'], borderWidth: 0, hoverOffset: 4 }] },
                  options: { cutout: '70%', animation: { duration: 1200, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111' } }, responsive: true, maintainAspectRatio: false },
                })} />
              </ChartBoundary>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <b style={{ fontSize: 13 }}>{statusMix.total.toLocaleString()}</b>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Total Orders</span>
              </div>
            </div>
            <div className="orders-legend">
              {statusMix.rows.map((s) => (
                <div className="ol-item" key={s.name}>
                  <div className="ol-dot" style={{ background: s.color }}></div> {s.name} <span style={{ marginLeft: 6 }}>{s.pct.toFixed(0)}% ({s.value})</span>
                </div>
              ))}
              {!statusMix.rows.length && <div className="ol-item" style={{ color: '#9ca3af' }}>No orders in this period.</div>}
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Link to="/admin/orders" className="btn-sm">View all orders ▾</Link>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><span className="card-t">Customer Overview</span></div>
          <div className="cust-head">
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Total Customers</div>
              <div className="cust-big">{totalCustomers.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {typeof k.customers?.change === 'number' && (
                <div className="cust-growth"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> {Math.abs(k.customers.change).toFixed(1)}%</div>
              )}
              <div className="cust-sub">{vsLabel}</div>
            </div>
          </div>
          <div className="cust-line">
            <ChartBoundary>
              <ChartBox deps={[sparkCust.join(',')]} build={() => ({
                type: 'line',
                data: { labels: sparkCust.map((_, i) => i), datasets: [{ data: sparkCust, borderColor: '#111', borderWidth: 1.3, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#fff', pointBorderColor: '#111', pointBorderWidth: 1.5, fill: false, pointHoverRadius: 5 }] },
                options: { responsive: true, maintainAspectRatio: false, animation: { duration: 1200, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111' } }, scales: { x: { display: false }, y: { display: false } } },
              })} />
            </ChartBoundary>
          </div>
          <div className="cust-bottom">
            <div className="cust-b">
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>New Customers</div>
              <b>{Number(k.customers?.value || 0).toLocaleString()}</b>{' '}
              {typeof k.customers?.change === 'number' && <span style={{ fontSize: 10, color: 'var(--green)' }}>↑ {Math.abs(k.customers.change).toFixed(1)}%</span>}
            </div>
            <div className="cust-b">
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>Returning Customers</div>
              <b>{returning.toLocaleString()}</b>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><span className="card-t">Top Categories</span><Link to="/admin/categories" style={{ fontSize: 10.5, color: 'var(--muted)' }}>View all</Link></div>
          <div>
            {catBars.length === 0 && <p style={{ padding: '24px 0', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>Category sales appear with orders.</p>}
            {catBars.map((c) => (
              <div className="cat-row" key={c.slug}>
                <span className="cat-name">{c.name}</span>
                <div className="cat-bar"><div style={{ width: barsIn ? `${c.pct}%` : '0%' }}></div></div>
                <span className="cat-val">{rs(c.revenue, 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── quick actions ───────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="card-h"><span className="card-t">Quick Actions</span></div>
        <div className="quick">
          {QUICK.map((a) => (
            <Link key={a.label} to={a.to} className="q-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">{a.d}</svg>
              <span>{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── smart insights ──────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-h"><span className="card-t">• Smart Insights</span></div>
        <div className="insights">
          {insightCards.map((c) => (
            <Link key={c.title} to={c.to} className="ins-card">
              <div className="ins-left">
                <div className="ins-ico"><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6">{c.ico}</svg></div>
                <div><b>{c.title}</b><p>{c.body}</p></div>
              </div>
              {c.bars ? (
                <span style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                  <span style={{ width: 4, height: 12, background: '#111', borderRadius: 2 }}></span>
                  <span style={{ width: 4, height: 18, background: '#555', borderRadius: 2 }}></span>
                  <span style={{ width: 4, height: 24, background: '#111', borderRadius: 2 }}></span>
                </span>
              ) : c.cta ? (
                <span className="ins-link">{c.cta}</span>
              ) : (
                <span className="ins-arrow">→</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* ── toast ──────────────────────────────────────────────────────── */}
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        <span>{toast || 'Done'}</span>
      </div>

      {/* ── modals (reference dialogs, wired to real routes) ────────────── */}
      <div className={`modal ${modal === 'addModal' ? 'show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setModal(''); }}>
        <div className="modal-box">
          <h3>Add New</h3>
          <p>Create a new order, product, promotion, page or blog article. Choose where to start.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <Link className="btn-sm" to="/admin/orders/new" style={{ display: 'flex', justifyContent: 'center' }}>New order</Link>
            <Link className="btn-sm" to="/admin/products/new" style={{ display: 'flex', justifyContent: 'center' }}>New product</Link>
            <Link className="btn-sm" to="/admin/promotions/new" style={{ display: 'flex', justifyContent: 'center' }}>New promotion</Link>
            <Link className="btn-sm" to="/admin/cms/new" style={{ display: 'flex', justifyContent: 'center' }}>New page</Link>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={() => setModal('')}>Cancel</button>
            <button type="button" className="primary" onClick={() => { setModal(''); nav('/admin/orders/new'); }}>Create</button>
          </div>
        </div>
      </div>

      <div className={`modal ${modal === 'notifModal' ? 'show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setModal(''); }}>
        <div className="modal-box">
          <h3>Notifications ({alerts} new)</h3>
          <p>
            • {todayOrders} New Orders<br />
            • {pendingPay} Pending Payments<br />
            • {lowStockN} Low Stock Alerts<br />
            • {k.customers?.value || 0} New Customers
          </p>
          <div className="modal-actions">
            <button type="button" onClick={() => setModal('')}>Close</button>
            <button type="button" className="primary" onClick={() => { setBadgeHidden(true); say('All notifications marked as read'); setModal(''); }}>Mark all as read</button>
          </div>
        </div>
      </div>
    </div>,
  );
}

/* ── live visitors bars — same look & cadence as the reference ────────────── */
const BASE_HEIGHTS = [12, 22, 8, 28, 18, 30, 14, 20, 26, 10, 24, 16, 28, 12, 20, 22, 8, 26, 18, 14, 24, 10, 28, 16, 20, 12, 22, 18, 26, 14, 18, 22, 12, 28, 16, 20, 14, 24, 10, 26];

function LiveBars() {
  const ref = useRef(null);
  useEffect(() => {
    const t = setInterval(() => {
      if (!ref.current) return;
      ref.current.querySelectorAll('div').forEach((div) => {
        div.style.height = `${Math.floor(8 + Math.random() * 26)}px`;
      });
    }, 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="live-bars" ref={ref}>
      {BASE_HEIGHTS.map((h, i) => <div key={i} style={{ height: `${h}px` }} />)}
    </div>
  );
}
