let simMap, simDirectionsService, simDirectionsRenderer;

function initSimMap() {
  simMap = new google.maps.Map(document.getElementById('sim-map'), {
    center: { lat: 38.7223, lng: -9.1393 }, // Lisboa
    zoom: 11,
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#17130f' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0b08' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#948676' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#201a14' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d0b08' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0b08' }] },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] }
    ]
  });

  simDirectionsService = new google.maps.DirectionsService();
  simDirectionsRenderer = new google.maps.DirectionsRenderer({
    map: simMap,
    polylineOptions: { strokeColor: '#c9a16a', strokeWeight: 5 },
    suppressMarkers: false
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('sim-calcular');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const origem = document.getElementById('sim-origem').value.trim();
    const destino = document.getElementById('sim-destino').value.trim();
    const taxaKm = parseFloat(document.getElementById('sim-categoria').value);
    const erroEl = document.getElementById('sim-erro');
    const resultadoEl = document.getElementById('sim-resultado');

    erroEl.style.display = 'none';
    resultadoEl.style.display = 'none';

    if (!origem || !destino) {
      erroEl.textContent = 'Preenche a origem e o destino.';
      erroEl.style.display = 'block';
      return;
    }

    if (typeof google === 'undefined' || !simDirectionsService) {
      erroEl.textContent = 'O mapa ainda está a carregar, tenta novamente em instantes.';
      erroEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'A calcular...';

    simDirectionsService.route(
      {
        origin: origem,
        destination: destino,
        travelMode: google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        btn.disabled = false;
        btn.textContent = 'Calcular preço';

        if (status !== 'OK') {
          erroEl.textContent = 'Não foi possível calcular a rota. Confirma os locais indicados.';
          erroEl.style.display = 'block';
          return;
        }

        simDirectionsRenderer.setDirections(result);

        const leg = result.routes[0].legs[0];
        const distanciaKm = leg.distance.value / 1000;
        const preco = distanciaKm * taxaKm;

        document.getElementById('sim-distancia').textContent = distanciaKm.toFixed(1) + ' km';
        document.getElementById('sim-duracao').textContent = leg.duration.text;
        document.getElementById('sim-preco').textContent = preco.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
        resultadoEl.style.display = 'block';
      }
    );
  });
});
