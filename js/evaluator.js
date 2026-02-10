// Utilities: card list, parsing, basic 7-card evaluator (correct, not ultra-optimized)
// Card representation: 'As', 'Td', '7h', '2c'.
// Ranks: 2-10,J,Q,K,A -> numbers 2..14
export const suits = ['s','h','d','c'];
export const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
export const cardList = (()=>{
  const out = [];
  for(const r of ranks){
    for(const s of suits){
      out.push(r + s);
    }
  }
  return out;
})();

export function parseCard(input){
  if(!input) throw new Error('empty');
  const txt = input.toUpperCase().replace(/\s+/g,'');
  const suit = txt.slice(-1).toLowerCase();
  let rank = txt.slice(0,-1);
  if(rank === 'T') rank = '10';
  if(suits.indexOf(suit) === -1) throw new Error('suit');
  const rIdx = ranks.indexOf(rank);
  if(rIdx === -1) throw new Error('rank');
  const num = 2 + rIdx; // 2..14
  return {rank:num, suit};
}
export function cardToString(card){
  if(typeof card === 'string') return card;
  const r = card.rank;
  const rankStr = r === 14 ? 'A' : (r === 13 ? 'K' : (r === 12 ? 'Q' : (r === 11 ? 'J' : String(r))));
  return rankStr + card.suit;
}

export const deck = cardList.slice();

// Evaluate best 5-card hand out of 7 cards
// returns an object {category: number (8..0), tiebreak: Array<number>} higher is better
// categories: 8=straight flush,7=four,6=full house,5=flush,4=straight,3=three,2=two pair,1=pair,0=high
function rankCounts(cards){
  const cnt = {};
  for(const c of cards){
    cnt[c.rank] = (cnt[c.rank]||0)+1;
  }
  return cnt;
}

function uniqueRanksSorted(cards){
  const set = new Set(cards.map(c=>c.rank));
  const arr = Array.from(set).sort((a,b)=>b-a);
  return arr;
}

function detectStraight(uniqueRanks){
  const rset = new Set(uniqueRanks);
  const ranksAll = uniqueRanks.slice();
  if(rset.has(14)) ranksAll.push(1); // Ace low
  ranksAll.sort((a,b)=>b-a);
  for(let i=0;i<=ranksAll.length-5;i++){
    let ok=true;
    for(let j=0;j<4;j++){
      if(ranksAll[i+j] - ranksAll[i+j+1] !== 1){ ok=false; break; }
    }
    if(ok) return ranksAll[i];
  }
  return null;
}

export function evaluate7(cardStrs){
  const cards = cardStrs.map(s=>{
    if(typeof s === 'string'){
      const parsed = parseCard(s);
      return parsed;
    }
    return s;
  });
  const suitsMap = {};
  for(const c of cards){
    suitsMap[c.suit] = suitsMap[c.suit] || [];
    suitsMap[c.suit].push(c);
  }
  let flushSuit = null;
  for(const s of Object.keys(suitsMap)){
    if(suitsMap[s].length >= 5){ flushSuit = s; break; }
  }
  const ranksCnt = rankCounts(cards);
  const groups = Object.entries(ranksCnt).map(([r,c])=>({rank:parseInt(r),count:c})).sort((a,b)=>{
    if(b.count!==a.count) return b.count - a.count;
    return b.rank - a.rank;
  });

  const uniq = uniqueRanksSorted(cards);
  let straightHigh = detectStraight(uniq);

  if(flushSuit){
    const flushCards = suitsMap[flushSuit].map(c=>c.rank);
    const uniqFlush = Array.from(new Set(flushCards)).sort((a,b)=>b-a);
    if(uniqFlush.indexOf(14)!==-1) uniqFlush.push(1);
    const sfHigh = detectStraight(uniqFlush);
    if(sfHigh) return {category:8, tiebreak:[sfHigh]};
  }

  if(groups[0].count === 4){
    const fourRank = groups[0].rank;
    const kickers = uniqueRanksSorted(cards).filter(r=>r!==fourRank).slice(0,1);
    return {category:7, tiebreak:[fourRank, ...kickers]};
  }

  if(groups[0].count === 3 && groups.length>1 && (groups[1].count >= 2)){
    const threeRank = groups[0].rank;
    let pairRank = null;
    for(let i=1;i<groups.length;i++){
      if(groups[i].count >=2){ pairRank = groups[i].rank; break; }
    }
    if(pairRank) return {category:6, tiebreak:[threeRank, pairRank]};
  }

  if(flushSuit){
    const flushCards = suitsMap[flushSuit].map(c=>c.rank).sort((a,b)=>b-a).slice(0,5);
    return {category:5, tiebreak:flushCards};
  }

  if(straightHigh) return {category:4, tiebreak:[straightHigh]};

  if(groups[0].count === 3){
    const threeRank = groups[0].rank;
    const kickers = uniqueRanksSorted(cards).filter(r=>r!==threeRank).slice(0,2);
    return {category:3, tiebreak:[threeRank, ...kickers]};
  }

  if(groups[0].count === 2 && groups[1] && groups[1].count === 2){
    const pair1 = groups[0].rank;
    const pair2 = groups[1].rank;
    const kicker = uniqueRanksSorted(cards).filter(r=>r!==pair1 && r!==pair2)[0];
    return {category:2, tiebreak:[pair1, pair2, kicker]};
  }

  if(groups[0].count === 2){
    const pair = groups[0].rank;
    const kickers = uniqueRanksSorted(cards).filter(r=>r!==pair).slice(0,3);
    return {category:1, tiebreak:[pair, ...kickers]};
  }

  const highCards = uniqueRanksSorted(cards).slice(0,5);
  return {category:0, tiebreak:highCards};
}

export function compareEval(a,b){
  if(a.category !== b.category) return a.category - b.category;
  for(let i=0;i<Math.max(a.tiebreak.length,b.tiebreak.length);i++){
    const ai = a.tiebreak[i]||0;
    const bi = b.tiebreak[i]||0;
    if(ai !== bi) return ai - bi;
  }
  return 0;
}
