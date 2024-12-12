
async function fetchAssignments() {
  const myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer YOUR_ACCESS_TOKEN");
  myHeaders.append("Cookie", "YOUR_COOKIE_HERE");

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow"
  };

  try {
    const response = await fetch("https://uta.instructure.com/api/v1/users/<your user id>/courses/<your course id>/assignments?include[]=submission&per_page=100&include[]=score_statistics", requestOptions);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(error);
  }
}

const assignments = fetchAssignments();

function calculatePercentiles(assignments) {
  let totalWeightedPercentilePoints = 0;
  let totalPointsPossible = 0;
  let results = [];

  assignments.forEach((assignment) => {
    const {
      name,
      points_possible,
      score_statistics,
      submission,
    } = assignment;

    //ignore missing data 
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
      position = (userScore - min) / (Q1 - min);
      percentileRank = position * 25;
    } else if (userScore < Q2) {
      position = (userScore - Q1) / (Q2 - Q1);
      percentileRank = 25 + position * 25;
    } else if (userScore < Q3) {
      position = (userScore - Q2) / (Q3 - Q2);
      percentileRank = 50 + position * 25;
    } else {
      position = (userScore - Q3) / (max - Q3);
      percentileRank = 75 + position * 25;
    }

    //normalize 0-100
    percentileRank = Math.max(0, Math.min(100, percentileRank));

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
    (totalWeightedPercentilePoints / totalPointsPossible).toFixed(2);
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
console.log("Assignment Percentiles:");
result.assignments.forEach((item) => {
  console.log(
    `${item.name}: Score = ${item.userScore}, Percentile = ${item.percentileRank}%`     
  );
});



console.log(`\nEstimated Percentile: ${result.overallPercentile}%`);
