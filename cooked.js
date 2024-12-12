async function fetchAssignments() {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer <token>");
  myHeaders.append("Cookie", "_csrf_token=T%2FlszvkWS8rQnYenraj1cUiTGObDVx5K4pBSAYxOzMwAnlqKnGUi%2Bp%2Bqs8Ph34BeJcRRtI8bWAia52tNwmWoiA%3D%3D; _legacy_normandy_session=rbmGEAS92HjR5gfYz8ZFQw.qqwNNbITxgRwPx3yNQSp9hOHMimrcbtcJ5DfAgPHL_MshnybShhES87jzs49gHGKlg65gUSB8eDTIziYNuMX8VRRlkJwzCwibDNkAsvQ-IpKSxspOhHs8zlODaPUhVkH.wCPZakCN-JoG_gxg4vAYfsw4eeg.Z1pU8g; canvas_session=rbmGEAS92HjR5gfYz8ZFQw.qqwNNbITxgRwPx3yNQSp9hOHMimrcbtcJ5DfAgPHL_MshnybShhES87jzs49gHGKlg65gUSB8eDTIziYNuMX8VRRlkJwzCwibDNkAsvQ-IpKSxspOhHs8zlODaPUhVkH.wCPZakCN-JoG_gxg4vAYfsw4eeg.Z1pU8g; log_session_id=3416922ca5daa7a28ca06ceddf4914cc");

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow"
  };

  try {
    const response = await fetch("https://uta.instructure.com/api/v1/users/169372/courses/210219/assignments?include[]=submission&per_page=100&include[]=score_statistics", requestOptions);
    return await response.json()
  } catch (error) {
    console.error(error);
  }
}

const assignments = await fetchAssignments();
console.log(assignments)

function calculatePercentiles(assignments) {
  let totalWeightedPercentilePoints = 0
  let totalPointsPossible = 0
  let results = [];

  assignments.forEach((assignment) => {
    const {
      name,
      points_possible,
      score_statistics,
      submission,
    } = assignment;

    // ignore missing data
    if (
      !points_possible ||
      !score_statistics ||
      !submission ||
      submission.score === null
    ) {
      return;
    }

    const userScore = submission.score;
    const { min, lower_q: Q1, median: Q2, upper_q: Q3, max } = score_statistics;

    let percentileRank = 0;
    let position = 0;

    if (userScore < Q1) {
      // Below Q1 (0th to 25th percentile)
      position = (userScore - min) / (Q1 - min);
      percentileRank = position * 25;
    } else if (userScore < Q2) {
      // Between Q1 and Q2 (25th to 50th percentile)
      position = (userScore - Q1) / (Q2 - Q1);
      percentileRank = 25 + position * 25;
    } else if (userScore < Q3) {
      // Between Q2 and Q3 (50th to 75th percentile)
      position = (userScore - Q2) / (Q3 - Q2);
      percentileRank = 50 + position * 25;
    } else {
      // Above Q3 (75th to 100th percentile)
      position = (userScore - Q3) / (max - Q3);
      percentileRank = 75 + position * 25;
    }

    // normalize percentile 0 to 100
    percentileRank = Math.max(0, Math.min(100, percentileRank));

    // weighted percentile 
    const weightedPercentile = (percentileRank * points_possible) / points_possible;
    totalWeightedPercentilePoints += weightedPercentile;
    totalPointsPossible += points_possible;

    results.push({
      name,
      points_possible,
      userScore,
      percentileRank: percentileRank.toFixed(2),
    });
  });

  //overall percentile
  const overallPercentile =
    (totalWeightedPercentilePoints / totalPointsPossible).toFixed(2)  


  return {
    assignments: results,
    overallPercentile,
  };
}

function computeRank(overallPercentile, totalStudents) {
  const P = Math.max(0, Math.min(100, overallPercentile));
  const N = totalStudents;
  const rank = N - ((P * (N - 1)) / 100);
  return Math.round(rank);
}  
 

const result = calculatePercentiles(assignments);
const rank = computeRank(result.overallPercentile, 20)
console.log("Assignment Percentiles:")
result.assignments.forEach((item) => {
  console.log(
    `${item.name}: Score = ${item.userScore}, Percentile = ${item.percentileRank}%`
  );
});

console.log(`\nEstimated Percentile: ${result.overallPercentile}%`);
console.log(`\nEstimated Rank: ${rank}`);
