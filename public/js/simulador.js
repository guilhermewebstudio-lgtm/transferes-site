let simMap, simRouteLine, simOrigemMarker, simDestinoMarker;

function initSimMapBase() {
  if (simMap) return;
  simMap = L.map('sim-map', { zoomControl: true }).setView([38.7223, -9.1393], 11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }).addTo(simMap);
}

document.addEventListener('DOMContentLoaded', () => {
  initSimMapBase();

  const btn = document.getElementById('sim-calcular');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const origem = document.getElementById('sim-origem').value.trim();
    const destino = document.getElementById('sim-destino').value.trim();
    const taxaKm = document.getElementById('sim-categoria').value;
    const erroEl = document.getElementById('sim-erro');
    const resultadoEl = document.getElementById('sim-resultado');

    erroEl.style.display = 'none';
    resultadoEl.style.display = 'none';

    if (!origem || !destino) {
      erroEl.textContent = 'Preenche a origem e o destino.';
      erroEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'A calcular...';

    try {
      const res = await fetch('/api/simulador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origem, destino, taxaKm })
      });
      const data = await res.json();

      if (!data.ok) {
        erroEl.textContent = data.erro || 'Não foi possível calcular. Tenta novamente.';
        erroEl.style.display = 'block';
        return;
      }

      document.getElementById('sim-distancia').textContent = data.distanciaKm.toLocaleString('pt-PT') + ' km';
      document.getElementById('sim-duracao').textContent = data.duracaoMin + ' min';
      document.getElementById('sim-preco').textContent = data.preco.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
      resultadoEl.style.display = 'block';

      // Desenhar a rota no mapa
      if (simRouteLine) simMap.removeLayer(simRouteLine);
      if (simOrigemMarker) simMap.removeLayer(simOrigemMarker);
      if (simDestinoMarker) simMap.removeLayer(simDestinoMarker);

      simRouteLine = L.polyline(data.rota, { color: '#c9a16a', weight: 5, opacity: 0.9 }).addTo(simMap);

      const goldIcon = L.divIcon({
        className: 'sim-marker',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#c9a16a;border:2px solid #0d0b08;"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      simOrigemMarker = L.marker([data.origem.lat, data.origem.lon], { icon: goldIcon }).addTo(simMap);
      simDestinoMarker = L.marker([data.destino.lat, data.destino.lon], { icon: goldIcon }).addTo(simMap);

      simMap.fitBounds(simRouteLine.getBounds(), { padding: [30, 30] });
    } catch (err) {
      erroEl.textContent = 'Erro de ligação. Tenta novamente.';
      erroEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Calcular preço';
    }
  });
});
