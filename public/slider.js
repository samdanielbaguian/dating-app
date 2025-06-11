// Gestion sliders pour settings.html (distance, âge recherché...)

document.addEventListener('DOMContentLoaded', () => {
  // Distance slider
  const distanceSlider = document.getElementById('distanceSlider');
  const distanceValue = document.getElementById('distanceValue');
  if (distanceSlider && distanceValue) {
    distanceSlider.addEventListener('input', function() {
      distanceValue.textContent = `${this.value} km`;
    });
    // Affichage initial
    distanceValue.textContent = `${distanceSlider.value} km`;
  }

  // Double slider pour l'âge recherché
  const ageMinSlider = document.getElementById('ageMinSlider');
  const ageMaxSlider = document.getElementById('ageMaxSlider');
  const ageRangeValue = document.getElementById('ageRangeValue');

  function updateAgeRange() {
    let min = parseInt(ageMinSlider.value, 10);
    let max = parseInt(ageMaxSlider.value, 10);
    // Synchronisation pour éviter croisement
    if (min > max) {
      if (this === ageMinSlider) ageMaxSlider.value = min;
      else ageMinSlider.value = max;
      min = Math.min(min, max);
      max = Math.max(min, max);
    }
    if (ageRangeValue)
      ageRangeValue.textContent = `${min} - ${max} ans`;
  }

  if (ageMinSlider && ageMaxSlider && ageRangeValue) {
    ageMinSlider.addEventListener('input', updateAgeRange);
    ageMaxSlider.addEventListener('input', updateAgeRange);
    // Affichage initial
    updateAgeRange();
  }
});
