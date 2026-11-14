export function parseCSVRows(csvText) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(field);
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (inQuotes) throw new Error('CSV contains an unclosed quoted field.');
  row.push(field);
  if (row.some(value => value.trim() !== '')) rows.push(row);
  return rows;
}

export function normalizeTrackMetrics(item) {
  let playCount = parseInt(item.playCount || item.plays || item.popularity || 0, 10);
  if (isNaN(playCount) || playCount < 0) playCount = 0;

  let energy = parseFloat(item.energy !== undefined ? item.energy : 50);
  if (isNaN(energy)) energy = 50;
  energy = Math.max(0, Math.min(100, energy));

  let releaseYear = parseInt(item.releaseYear || item.year || (item.album && typeof item.album === 'object' ? parseInt(item.album.release_date) : 2020) || 2020, 10);
  if (isNaN(releaseYear)) releaseYear = 2020;
  releaseYear = Math.max(1900, Math.min(2026, releaseYear));

  return { playCount, energy, releaseYear };
}

export function trackIdentity(track) {
  if (track.spotifyId) return `spotify:${track.spotifyId}`;
  return `${String(track.songName || '').trim()}|${String(track.artist || '').trim()}`.toLowerCase();
}

export function mergeTrackCollections(existing, incoming, serializeTrack = track => ({ ...track })) {
  const merged = existing.map(track => serializeTrack(track));
  const identities = new Set(merged.map(track => trackIdentity(track)));
  let added = 0;

  incoming.forEach(track => {
    const identity = trackIdentity(track);
    if (!identities.has(identity)) {
      merged.push(serializeTrack(track));
      identities.add(identity);
      added++;
    }
  });

  return { merged, added };
}
