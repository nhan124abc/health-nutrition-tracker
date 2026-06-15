const colors = ['#ff6b35', '#ffd166', '#2f8f6b', '#3b9fbd', '#ef476f', '#8d6bce'];

function GoalFireworks({ visible }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="goal-fireworks" aria-hidden="true">
      {[18, 50, 82].map((left, burstIndex) => (
        <div
          className="goal-fireworks-burst"
          style={{ left: `${left}%`, top: `${22 + burstIndex * 12}%` }}
          key={left}
        >
          {Array.from({ length: 16 }, (_, particleIndex) => {
            const angle = particleIndex * 22.5;
            const distance = 70 + (particleIndex % 4) * 14;

            return (
              <span
                className="goal-fireworks-particle"
                key={particleIndex}
                style={{
                  '--firework-angle': `${angle}deg`,
                  '--firework-distance': `${distance}px`,
                  '--firework-color': colors[(particleIndex + burstIndex) % colors.length],
                  '--firework-delay': `${burstIndex * 0.18}s`,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default GoalFireworks;
