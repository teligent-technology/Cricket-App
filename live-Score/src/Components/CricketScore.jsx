import React, { useEffect, useState } from "react";
import "../styles/CricketScore.css";

const CricketScore = () => {
  const [data, setData] = useState([]);
  const [inputData, setInputData] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const getData = async (searchQuery = "") => {
    try {
      setLoading(true);
      setError(null);
      const url = searchQuery
        ? `https://api.cricapi.com/v1/cricScore?apikey=0328c2e4-976d-4f98-a46c-16b370991bbc&search=${encodeURIComponent(
            searchQuery
          )}`
        : "https://api.cricapi.com/v1/cricScore?apikey=0328c2e4-976d-4f98-a46c-16b370991bbc";

      const response = await fetch(url);
      const result = await response.json();

      console.log("API Response:", result); // Debug purpose

      if (result.status === "success" && Array.isArray(result.data)) {
        setData(result.data);
      } else if (result.status === "failure") {
        setError(result.message || "API returned failure");
        setData([]);
      } else {
        setData([]);
      }

      setLoading(false);
    } catch (err) {
      setError("Failed to fetch data");
      setLoading(false);
    }
  };

  useEffect(() => {
    getData(search);
  }, [search]);

  // Dark mode toggle effect (optional)
  useEffect(() => {
    if (darkMode) document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");
  }, [darkMode]);

  return (
    <div className={`main-container ${darkMode ? "dark" : ""}`}>
      <div className="animated-background"></div>

      <header className="top-bar">
        <div className="searchBar">
          <input
            type="text"
            placeholder="🔍 Search Series or Teams..."
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(inputData.trim())}
            aria-label="Search Series or Teams"
            autoComplete="off"
          />
          <button onClick={() => setSearch(inputData.trim())} aria-label="Search">
            GO
          </button>
        </div>

        <button
          className="dark-mode-toggle"
          onClick={() => setDarkMode((prev) => !prev)}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </header>

      <div className="heading" aria-label="App Title and Logo">
        <img src="/Circle/circle.jpg" alt="App Logo" width={200} />
        <h1 tabIndex={0}>⚡️ Live Cricket Score</h1>
      </div>

      {error && (
        <div className="error-message" role="alert">
          ⚠️ Error: {error}
        </div>
      )}

      {loading ? (
        <div className="loader" aria-busy="true" aria-live="polite"></div>
      ) : (
        <div className="score-container" role="list">
          {data?.length > 0 ? (
            data.map((match, i) =>
              match.status &&
              !match.status.toLowerCase().includes("not started") ? (
                <article
                  className="card"
                  key={match.id || i}
                  tabIndex={0}
                  aria-label={`Match between ${match.t1} and ${match.t2}, status: ${match.status}`}
                  role="listitem"
                >
                  <h3>{match.series}</h3>
                  <h4>{match.matchType}</h4>
                  <div className="teams">
                    <div>
                      <img
                        src={match.t1img || "/default-team.png"}
                        alt={match.t1}
                        width={60}
                        height={60}
                        loading="lazy"
                      />
                      <p>{match.t1}</p>
                      <p>{match.t1s}</p>
                    </div>
                    <div>
                      <img
                        src={match.t2img || "/default-team.png"}
                        alt={match.t2}
                        width={60}
                        height={60}
                        loading="lazy"
                      />
                      <p>{match.t2}</p>
                      <p>{match.t2s}</p>
                    </div>
                  </div>
                  <p className="status">{match.status}</p>
                </article>
              ) : null
            )
          ) : (
            <p className="not-found" tabIndex={0}>
              ⚠️ No Matches Found!
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CricketScore;
