// Utilitário partilhado para calcular a distância de condução entre duas moradas,
// usado tanto pelo simulador público como pelo cálculo automático de preço no admin.
// Usa Nominatim (geocoding) + OSRM (routing) — ambos gratuitos, sem chave de API.

async function geocode(endereco) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`;
  const resposta = await fetch(url, { headers: { 'User-Agent': 'SRRide-Site/1.0' } });
  const dados = await resposta.json();
  if (!dados || dados.length === 0) return null;
  return { lat: parseFloat(dados[0].lat), lon: parseFloat(dados[0].lon) };
}

/**
 * Calcula a distância de condução entre duas moradas.
 * @returns {Promise<{distanciaKm:number, duracaoMin:number, rotaCoords:number[][], origemCoords:object, destinoCoords:object}|null>}
 *          null se não for possível geocodificar ou traçar rota entre os locais.
 */
async function calcularDistancia(origem, destino, { comRota = false } = {}) {
  if (!origem || !destino) return null;

  const [origemCoords, destinoCoords] = await Promise.all([geocode(origem), geocode(destino)]);
  if (!origemCoords || !destinoCoords) return null;

  const overviewParam = comRota ? 'full' : 'false';
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origemCoords.lon},${origemCoords.lat};${destinoCoords.lon},${destinoCoords.lat}?overview=${overviewParam}&geometries=geojson${comRota ? '&steps=true' : ''}`;
  const rotaResposta = await fetch(osrmUrl);
  const rotaDados = await rotaResposta.json();

  if (!rotaDados.routes || rotaDados.routes.length === 0) return null;

  const distanciaKm = rotaDados.routes[0].distance / 1000;
  const duracaoMin = Math.round(rotaDados.routes[0].duration / 60);

  const resultado = { distanciaKm, duracaoMin, origemCoords, destinoCoords };

  if (comRota) {
    resultado.rotaCoords = rotaDados.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    resultado.steps = rotaDados.routes[0].legs.flatMap((leg) => leg.steps);
  }

  return resultado;
}

module.exports = { calcularDistancia, geocode };
