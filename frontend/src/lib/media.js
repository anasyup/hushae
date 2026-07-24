// Media helpers — detect video vs photo items in gallery/media lists
export const ytId = (u) => (String(u || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/) || [])[1];

// File-based videos (MP4/WebM/MOV…) — playable with a <video> tag
export const isVideoFile = (u = '') => /\.(mp4|webm|mov|m4v|ogv|ogg)(\?|#|$)/i.test(String(u));

// Any video item — file video OR YouTube link
export const isVideo = (u = '') => isVideoFile(u) || !!ytId(u);
