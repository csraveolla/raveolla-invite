<?php
/**
 * index.php — PHP Router for Multi-Theme Wedding Invitation
 * 
 * Query Supabase by slug → determine theme → serve theme HTML
 */

// ── CONFIG ──────────────────────────────────────────────────────
$config = require __DIR__ . '/config.php';
$SUPABASE_URL  = $config['SUPABASE_URL'];
$SUPABASE_KEY  = $config['SUPABASE_KEY'];
$DEFAULT_THEME = $config['DEFAULT_THEME'];
$CACHE_TTL     = $config['CACHE_TTL'];

// ── PARSE SLUG ──────────────────────────────────────────────────
$slug = trim($_GET['slug'] ?? '', '/');

// Jika slug kosong → 404 (landing page nanti)
if (empty($slug)) {
    http_response_code(404);
    echo '<!DOCTYPE html><html><head><title>404</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f0f0f;color:#888;font-family:sans-serif"><div style="text-align:center"><p style="font-size:48px;margin:0">404</p><p style="margin-top:8px">Halaman tidak ditemukan</p></div></body></html>';
    exit;
}

// ── QUERY SUPABASE ──────────────────────────────────────────────
$api_url = $SUPABASE_URL . '/rest/v1/invitations'
         . '?slug=eq.' . urlencode($slug)
         . '&is_published=eq.true'
         . '&select=theme_id,themes(name)';

$ch = curl_init($api_url);
curl_setopt_array($ch, [
    CURLOPT_HTTPHEADER     => [
        "apikey: {$SUPABASE_KEY}",
        "Authorization: Bearer {$SUPABASE_KEY}",
        "Content-Type: application/json"
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 5,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// ── DETERMINE THEME ─────────────────────────────────────────────
$theme = $DEFAULT_THEME;

if ($http_code === 200 && $response) {
    $data = json_decode($response, true);
    if (!empty($data[0]['themes']['name'])) {
        $theme = strtolower($data[0]['themes']['name']);
    }
}

// ── SERVE THEME HTML ────────────────────────────────────────────
$theme_path = __DIR__ . "/{$theme}/index.html";

// Fallback ke default theme jika file tidak ada
if (!file_exists($theme_path)) {
    $theme_path = __DIR__ . "/{$DEFAULT_THEME}/index.html";
}

// Jika masih tidak ada → 404
if (!file_exists($theme_path)) {
    http_response_code(404);
    echo '<!DOCTYPE html><html><head><title>404</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f0f0f;color:#888;font-family:sans-serif"><div style="text-align:center"><p style="font-size:48px;margin:0">404</p><p style="margin-top:8px">Tema tidak ditemukan</p></div></body></html>';
    exit;
}

// Serve dengan cache header
header('Content-Type: text/html; charset=utf-8');
header("Cache-Control: public, max-age={$CACHE_TTL}");
header('X-Theme: ' . $theme);
readfile($theme_path);
