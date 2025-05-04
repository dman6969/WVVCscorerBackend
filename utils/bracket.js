// utils/bracket.js
function getStandings(matches) {
    const table = {};   // { team: { wins, losses, pf, pa } }
  
    matches.forEach(m => {
      if (!m.finalized) return;
      const { team1, team2, team1Score, team2Score } = m;
  
      [team1, team2].forEach(t => {
        if (!table[t]) table[t] = { wins: 0, losses: 0, pf: 0, pa: 0 };
      });
  
      table[team1].pf += team1Score;  table[team1].pa += team2Score;
      table[team2].pf += team2Score;  table[team2].pa += team1Score;
  
      if (team1Score > team2Score) {
        table[team1].wins++; table[team2].losses++;
      } else {
        table[team2].wins++; table[team1].losses++;
      }
    });
  
    return Object.entries(table)
      .map(([name, rec]) => ({ name, ...rec }))
      .sort((a, b) =>
        b.wins - a.wins ||                // wins desc
        (b.pf - b.pa) - (a.pf - a.pa)     // point‑diff desc
      );
  }
  
  // supports 4‑, 6‑ or 8‑team brackets
  function seedBracket(standings) {
    const t = standings.map(s => s.name);   // names only
    const bracket = [];
  
    if (t.length >= 8) {
      bracket.push([t[0], t[7]]);
      bracket.push([t[3], t[4]]);
      bracket.push([t[2], t[5]]);
      bracket.push([t[1], t[6]]);
    } else if (t.length >= 6) {             // top‑2 bye
      bracket.push([t[2], t[5]]);
      bracket.push([t[3], t[4]]);
    } else if (t.length >= 4) {
      bracket.push([t[0], t[3]]);
      bracket.push([t[1], t[2]]);
    }
    return bracket;        // array of [teamA, teamB]
  }
  
  module.exports = { getStandings, seedBracket };