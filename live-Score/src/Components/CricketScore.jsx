import React, { useEffect, useState } from "react";
import "../styles/CricketScore.css"
const CricketScore = () => {
  const [data, setData] = useState([]);
  const [inputData, setInputData] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const getData = async (searchQuery = "") => {
    try {
      setLoading(true);
      const url = searchQuery
        ? `https://api.cricapi.com/v1/cricScore?apikey=0328c2e4-976d-4f98-a46c-16b370991bbc&search=${searchQuery}`
        : "https://api.cricapi.com/v1/cricScore?apikey=0328c2e4-976d-4f98-a46c-16b370991bbc";
      const response = await fetch(url);
      const result = await response.json();
      setData(result.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    getData(search);
  }, [search]);

  return (
    <div className="main-container">
      <div className="animated-background"></div>
      <div className="searchBar">
        <input
          type="text"
          placeholder="🔍 Search Series or Teams..."
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
        />
        <button onClick={() => setSearch(inputData)}>GO</button>
      </div>

      <div className="heading">
      <img src="/Circle/circle.jpg" alt="My Photo" width="300" />
        <h1>⚡️Live Cricket Score</h1>
      </div>

      {loading ? (
        <div className="loader"></div>
      ) : (
        <div className="score-container">
          {data?.length > 0 ? (
            data.map((match, i) =>
              match.status !== "Match not started" ? (
                <div className="card" key={i}>
                  <h3>{match.series}</h3>
                  <h4>{match.matchType}</h4>
                  <div className="teams">
                    <div>
                      <img src={match.t1img} alt={match.t1} />
                      <p>{match.t1}</p>
                      <p>{match.t1s}</p>
                    </div>
                    <div>
                      <img src={match.t2img} alt={match.t2} />
                      <p>{match.t2}</p>
                      <p>{match.t2s}</p>
                    </div>
                  </div>
                  <p className="status">{match.status}</p>
                </div>
              ) : null
            )
          ) : (
            <p className="not-found">⚠️ No Matches Found!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CricketScore;
