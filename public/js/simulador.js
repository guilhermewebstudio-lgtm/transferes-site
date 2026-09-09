document.addEventListener('DOMContentLoaded', () => {
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
    } catch (err) {
      erroEl.textContent = 'Erro de ligação. Tenta novamente.';
      erroEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Calcular preço';
    }
  });
});
