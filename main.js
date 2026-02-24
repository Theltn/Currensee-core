const url = import.meta.env.VITE_BACKEND_URL;
const frontend = import.meta.env.VITE_LOCAL_URL;
const LoginButton = document.getElementById("LoginButton");
const SignupButton = document.getElementById("SignupButton");
const LogoutButton = document.getElementById("logoutButton");
const getPriceButton = document.getElementById("getPriceButton");
const LoginSubmit = document.getElementById("LoginSubmit");
const SignupSubmit = document.getElementById("SignupSubmit");
const cancelLogin = document.getElementById("cancelLogin");
const cancelSignup = document.getElementById("cancelSignup");
const DashboardButton = document.getElementById("DashboardButton");

function getLogoSrc(stock) {
  if (!stock || !stock.ticker) return "";
  return `${url}/stocks/logo/${encodeURIComponent(stock.ticker)}`;
}


function fetchAllStocks() {
  fetch(`${url}/stocks/all`, {
    method: "GET",
    origin: frontend,
    credentials: "include", // Include cookies with the request
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Stock Data:", data);
      displayStocks(data);
    })
    .catch((error) => console.error("Error:", error));
}
function fetchStock() {
  const ticker = document.getElementById("tickerInput").value;
  fetch(`${url}/stocks/${ticker}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ticker: ticker }),
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          showWarningAlert("You must be logged in to search for stocks.");
        } else {
          showWarningAlert(
            "Failed to fetch stock data. Please try again."
          );
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Stock Data:", data);
      displayIndividualStock(data);
    })
    .catch((error) => console.error("Error:", error));
}
function displayIndividualStock(stock) {
  console.log("stock", stock);
  stockContainer.innerHTML = "";

  const cardDiv = document.createElement("div");
  cardDiv.classList.add("card");
  cardDiv.id = `card-${stock.ticker}`;

  const cardBody = document.createElement("div");
  cardBody.classList.add("card-body");

  const backButton = document.createElement("button");
  backButton.classList.add(
    "btn",
    "btn-secondary",
    "btn-sm",
    "position-absolute",
    "top-0",
    "end-0",
    "m-2"
  );
  backButton.textContent = "Back";
  backButton.onclick = () => {
    stockContainer.innerHTML = "";
    fetchAllStocks();
  };

  let logoHtml = "";
  const logoSrc = getLogoSrc(stock);
  if (logoSrc) {
    logoHtml = `<img src="${logoSrc}" alt="${stock.name} logo" class="img-fluid mb-2" style="max-width: 100px;">`;
  }

  const titleTicker = document.createElement("h5");
  titleTicker.classList.add("card-title");
  titleTicker.textContent = `Ticker : ${stock.ticker}`;

  const titleName = document.createElement("h5");
  titleName.classList.add("card-title");
  titleName.textContent = `Name : ${stock.name}`;

  const titleDescription = document.createElement("h5");
  titleDescription.classList.add("card-title");
  titleDescription.textContent = `Description : ${stock.description}`;

  const titleMarketCap = document.createElement("h5");
  titleMarketCap.classList.add("card-title");
  titleMarketCap.textContent = `Market Cap : ${stock.market_cap}`;

  const chartDiv = document.createElement("div");
  chartDiv.id = `${stock.ticker}-chart-div`;

  const canvas = document.createElement("canvas");
  canvas.id = `${stock.ticker}-chart`;

  chartDiv.appendChild(canvas);

  cardBody.innerHTML += logoHtml;
  cardBody.appendChild(titleTicker);
  cardBody.appendChild(titleName);
  cardBody.appendChild(titleDescription);
  cardBody.appendChild(titleMarketCap);
  cardBody.appendChild(chartDiv);

  const commentList = document.createElement("ul");
  commentList.id = `commentList-${stock.ticker}`;
  commentList.classList.add("list-group", "list-group-flush");

  const showCommentsButton = document.createElement("button");
  showCommentsButton.classList.add(
    "btn",
    "btn-primary",
    "btn-sm",
    "mt-2"
  );
  showCommentsButton.textContent = "Show Comments";
  showCommentsButton.onclick = () => showComments(stock.ticker);

  const commentsDiv = document.createElement("div");
  commentsDiv.classList.add("card-footer", "d-none");
  commentsDiv.id = `${stock.ticker}-comments`;

  const commentInput = document.createElement("input");
  commentInput.type = "text";
  commentInput.id = `commentInput-${stock.ticker}`;
  commentInput.classList.add("form-control");
  commentInput.placeholder = "Add a comment";

  const postCommentButton = document.createElement("button");
  postCommentButton.classList.add("btn", "btn-primary", "btn-sm", "mt-2");
  postCommentButton.textContent = "Post Comment";
  postCommentButton.onclick = () => addComment(stock.ticker);

  commentsDiv.appendChild(commentInput);
  commentsDiv.appendChild(postCommentButton);

  cardDiv.appendChild(cardBody);
  cardDiv.appendChild(commentList);
  cardDiv.appendChild(showCommentsButton);
  cardDiv.appendChild(commentsDiv);
  cardDiv.appendChild(backButton);

  stockContainer.appendChild(cardDiv);

  // Show chart after DOM element is added
  console.log('calling showChart', stock.ticker, 'bars:', stock.tradingData && Object.keys(stock.tradingData).length);
  showChart(stock.ticker, stock.tradingData);
}

//  Login after signup
function SignedUpLogin(email, password) {
  event.preventDefault();
  const payloadBody = { email, password }
  console.log("payloadBody", payloadBody);

  fetch(`${url}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payloadBody),
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        showWarningAlert("Invalid login details");
        throw new Error("Login failed");
      } else {
        fetchAllStocks();
        showSucess();
        hideLogin();
        emailInput.value = "";
        passwordInput.value = "";
      }
      return response.json();
    })
    .then((data) => {
      console.log("User Data:", data);
      deleteCookies();
      setCookie("username", data.username, 15); //  sets cookie to last for 15 mins
      LoginButton.classList.add("d-none");
      SignupButton.classList.add("d-none");
      LogoutButton.classList.remove("d-none");
      console.log("getCookie", getCookie("username"));
    })
    .catch((error) => console.error("Error:", error));
}

//  LOGIN REQUEST
function Login() {
  event.preventDefault();
  const emailInput = document.getElementById("LoginEmail");
  const passwordInput = document.getElementById("LoginPassword");
  const email = emailInput.value;
  const password = passwordInput.value;
  const userData = { email, password };
  console.log("front end - body", JSON.stringify(userData));
  fetch(`${url}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        showWarningAlert("Invalid login details");
        throw new Error("Login failed");
      } else {
        fetchAllStocks();
        showSucess();
        hideLogin();
        emailInput.value = "";
        passwordInput.value = "";
      }
      return response.json();
    })
    .then((data) => {
      console.log("User Data:", data);
      deleteCookies();
      setCookie("username", data.username, 15); //  sets cookie to last for 15 mins
      LoginButton.classList.add("d-none");
      SignupButton.classList.add("d-none");
      LogoutButton.classList.remove("d-none");
      console.log("getCookie", getCookie("username"));
    })
    .catch((error) => console.error("Error:", error));
}
function logout() {
  fetch(`${url}/users/logout`, {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data.message); // "Cookies cleared"
    });
  deleteCookies();
  stockContainer.innerHTML = "";
  LogoutButton.classList.add("d-none");
  LoginButton.classList.remove("d-none");
  SignupButton.classList.remove("d-none");
}
//  SIGNUP REQUEST
function Signup() {
  event.preventDefault();
  const emailInput = document.getElementById("SignupEmail");
  const usernameInput = document.getElementById("SignupUsername");
  const passwordInput = document.getElementById("SignupPassword");
  const email = emailInput.value;
  const username = usernameInput.value;
  const password = passwordInput.value;

  const userData = { email, username, password };

  console.log(
    "front end userData submitted JSON PARSE- ",
    JSON.stringify(userData)
  );
  fetch(`${url}/users/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  })
    .then((response) => {
      if (response.ok) {
        fetchAllStocks();
        showSucess();
        hideSignup();
        deleteCookies();
        setCookie("username", username.username, 15);
        emailInput.value = "";
        usernameInput.value = "";
        passwordInput.value = "";
        return response.json();
      }
      showWarningAlert("Invalid Signup details");
      throw new Error("Signup failed");
    })
    .then((data) => {
      console.log("Signup successful:", data);

      //  wherever you want to redirect
    })
    .catch((error) => console.error("Error:", error));
}
function displayStocks(data) {
  data.forEach((stock) => {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card");
    cardDiv.id = `card-${stock.ticker}`;

    const cardBody = document.createElement("div");
    cardBody.classList.add("card-body");

    let logoHtml = "";
    const logoSrc = getLogoSrc(stock);
    if (logoSrc) {
      logoHtml = `<img src="${logoSrc}" alt="${stock.name} logo" class="img-fluid mb-2" style="max-width: 100px;">`;
    }

    const titleTicker = document.createElement("h5");
    titleTicker.classList.add("card-title");
    titleTicker.textContent = `Ticker : ${stock.ticker}`;

    const titleName = document.createElement("h5");
    titleName.classList.add("card-title");
    titleName.textContent = `Name : ${stock.name}`;

    const titleDescription = document.createElement("h5");
    titleDescription.classList.add("card-title");
    titleDescription.textContent = `Description : ${stock.description}`;

    const titleMarketCap = document.createElement("h5");
    titleMarketCap.classList.add("card-title");
    titleMarketCap.textContent = `Market Cap : ${stock.market_cap}`;

    const chartDiv = document.createElement("div");
    chartDiv.id = `${stock.ticker}-chart-div`;

    const canvas = document.createElement("canvas");
    canvas.id = `${stock.ticker}-chart`;

    chartDiv.appendChild(canvas);

    cardBody.innerHTML += logoHtml;
    cardBody.appendChild(titleTicker);
    cardBody.appendChild(titleName);
    cardBody.appendChild(titleDescription);
    cardBody.appendChild(titleMarketCap);
    cardBody.appendChild(chartDiv);

    const commentList = document.createElement("ul");
    commentList.id = `commentList-${stock.ticker}`;
    commentList.classList.add("list-group", "list-group-flush");

    const showCommentsButton = document.createElement("button");
    showCommentsButton.classList.add(
      "btn",
      "btn-primary",
      "btn-sm",
      "mt-2"
    );
    showCommentsButton.textContent = "Show Comments";
    showCommentsButton.onclick = () => showComments(stock.ticker);

    const commentsDiv = document.createElement("div");
    commentsDiv.classList.add("card-footer", "d-none");
    commentsDiv.id = `${stock.ticker}-comments`;

    const commentInput = document.createElement("input");
    commentInput.type = "text";
    commentInput.id = `commentInput-${stock.ticker}`;
    commentInput.classList.add("form-control");
    commentInput.placeholder = "Add a comment";

    const postCommentButton = document.createElement("button");
    postCommentButton.classList.add(
      "btn",
      "btn-primary",
      "btn-sm",
      "mt-2"
    );
    postCommentButton.textContent = "Post Comment";
    postCommentButton.onclick = () => addComment(stock.ticker);

    commentsDiv.appendChild(commentInput);
    commentsDiv.appendChild(postCommentButton);

    cardDiv.appendChild(cardBody);
    cardDiv.appendChild(commentList);
    cardDiv.appendChild(showCommentsButton);
    cardDiv.appendChild(commentsDiv);

    stockContainer.appendChild(cardDiv);

    // Now that the canvas element is definitely in the DOM, call showChart
    showChart(stock.ticker, stock.tradingData);
  });
}
function hideLogin() {
  const bsCollapse = new bootstrap.Collapse(LoginForm, {
    toggle: false,
  });
  bsCollapse.hide();
}
function hideSignup() {
  const bsCollapse = new bootstrap.Collapse(SignupForm, {
    toggle: false,
  });
  bsCollapse.hide();
}
function showSucess() {
  const alert = document.getElementById("successAlert");
  alert.classList.remove("d-none");
  // Auto-hide after 3 seconds (3000 milliseconds)
  setTimeout(() => {
    alert.classList.add("d-none");
  }, 3000);
}
function showWarningAlert(message) {
  const alert = document.getElementById("warningAlert");
  alert.textContent = message; // Set the text of the alert to the provided message
  alert.classList.remove("d-none");

  // Auto-hide after 3 seconds (3000 milliseconds)
  setTimeout(() => {
    alert.classList.add("d-none");
  }, 3000);
}
function addComment(ticker) {
  const commentElement = document.getElementById(
    `commentInput-${ticker}`
  );
  if (!commentElement) {
    console.error(`Comment input not found for ticker: ${ticker}`);
    return;
  }
  if (!commentElement.value.trim()) {
    alert("Comment cannot be empty.");
    return;
  }
  const body = {
    ticker: ticker,
    username: getCookie("username"),
    comment: commentElement.value,
  };
  fetch(`${url}/comments/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  })
    .then((response) => {
      if (!response.ok) {
        showFailedAlert();
        throw new Error("Must be logged in");
      } else {
        commentElement.value = "";
        showComments(ticker);
      }
      return response.json();
    })
    .then((data) => {
      console.log("data - ", data);
    })
    .catch((error) => console.error("Error:", error));
}
function showComments(ticker) {
  const divName = `${ticker}-comments`;
  const username = getCookie("username");
  document.querySelector(`#${divName}`).classList.remove("d-none");

  fetch(`${url}/comments/${ticker}`, {
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.comments && data.comments.length > 0) {
        const commentList = document.getElementById(
          `commentList-${ticker}`
        );
        commentList.innerHTML = "";

        data.comments.forEach((comment) => {
          const commentItem = document.createElement("li");
          commentItem.classList.add(
            "list-group-item",
            "d-flex",
            "justify-content-between",
            "align-items-center"
          );

          const contentDiv = document.createElement("div");
          contentDiv.classList.add("flex-grow-1");

          const commentText = document.createElement("span");
          commentText.textContent = `${comment.username}: ${comment.comment}`;
          contentDiv.appendChild(commentText);

          commentItem.appendChild(contentDiv);

          if (comment.username === username) {
            const buttonGroup = document.createElement("div");

            // Edit Button
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.classList.add("btn", "btn-warning", "btn-sm", "ms-2");

            // Delete Button
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "X";
            deleteBtn.classList.add(
              "btn",
              "btn-danger",
              "btn-sm",
              "ms-2"
            );

            // Edit action
            editBtn.onclick = () => {
              const input = document.createElement("input");
              input.type = "text";
              input.value = comment.comment;
              input.classList.add("form-control", "me-2");

              const saveBtn = document.createElement("button");
              saveBtn.textContent = "Save";
              saveBtn.classList.add(
                "btn",
                "btn-success",
                "btn-sm",
                "me-2"
              );

              const cancelBtn = document.createElement("button");
              cancelBtn.textContent = "Cancel";
              cancelBtn.classList.add("btn", "btn-secondary", "btn-sm");

              contentDiv.innerHTML = "";
              contentDiv.appendChild(input);
              contentDiv.appendChild(saveBtn);
              contentDiv.appendChild(cancelBtn);

              saveBtn.onclick = () => {
                const newComment = input.value.trim();
                if (newComment) {
                  fetch(`${url}/comments/comment/${comment._id}`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({ updatedComment: newComment }),
                  })
                    .then((res) => res.json())
                    .then(() => showComments(ticker))
                    .catch((err) => console.error("Edit failed", err));
                }
              };

              cancelBtn.onclick = () => showComments(ticker);
            };

            // Delete action
            deleteBtn.onclick = async () => {
              await deleteComment(comment._id);
              showComments(ticker);
            };

            buttonGroup.appendChild(editBtn);
            buttonGroup.appendChild(deleteBtn);
            commentItem.appendChild(buttonGroup);
          }

          commentList.appendChild(commentItem);
        });

        document
          .getElementById(`${ticker}-comments`)
          .classList.remove("d-none");
      } else {
        console.log("No comments found for this stock");
      }
    })
    .catch((error) => console.error("Error fetching comments:", error));
}

async function deleteComment(commentId) {
  try {
    const response = await fetch(`${url}/comments/comment/${commentId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      console.error("Failed to delete comment");
    }
  } catch (error) {
    console.error("Error deleting comment:", error);
  }
}

function setCookie(name, value, minsToLive) {
  const date = new Date();
  date.setTime(date.getTime() + minsToLive * 60 * 1000);
  let expires = "expires=" + date.toUTCString();
  document.cookie = `${name}=${value}; ${expires}; path=/`;
}
function deleteCookies() {
  document.cookie.split(";").forEach((cookie) => {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
}
function getCookie(name) {
  const cDecoded = decodeURIComponent(document.cookie);
  const cArray = cDecoded.split("; ");
  let result = null;
  cArray.forEach((element) => {
    if (element.indexOf(name) == 0) {
      result = element.substring(name.length + 1);
    }
  });
  return result;
}

const FEATURED_TICKERS = ['CLSK', 'GOOG', 'META', 'UNH'];

// Tiny helper: wait for window.showChart (from chart.js UMD) to exist
function whenShowChartReady(cb, tries = 60) {
  if (typeof window.showChart === 'function') return cb();
  if (tries <= 0) return console.warn('showChart not found (is chart.js loaded?)');
  setTimeout(() => whenShowChartReady(cb, tries - 1), 50);
}

function addNote(card, msg) {
  const p = document.createElement('p');
  p.className = 'stock-note';
  p.textContent = msg;
  card.appendChild(p);
}

async function fetchFixedTicker(ticker) {
  try {
    const res = await fetch(`${url}/stocks/${ticker}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker }),
      credentials: 'include',
    });
    if (!res.ok) {
      const card = ensureCardShell({ ticker, name: ticker, logo: '' });
      addNote(card, res.status === 401 ? 'Log in to view live chart.' : 'Failed to load data.');
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    displayFeaturedStock(data);
  } catch (e) {
    console.warn('fetchFixedTicker error', ticker, e);
  }
}

function displayFeaturedStock(stock) {
  const grid = document.getElementById('featuredContainer');
  if (!grid) return;

  let card = document.getElementById(`card-${stock.ticker}`);
  if (!card) {
    card = ensureCardShell(stock);
    grid.appendChild(card);
  }

  if (stock.tradingData && stock.tradingData.length) {
    whenShowChartReady(() => {
      const canvas = card.querySelector('canvas');
      if (canvas) window.showChart(stock.ticker, stock.tradingData);
    });
  } else {
    addNote(card, 'No price data available.');
  }
}

function ensureCardShell(stock) {
  const grid = document.getElementById('featuredContainer');
  const card = document.createElement('div');
  card.className = 'stock-card';
  card.id = `card-${stock.ticker}`;

  const hdr = document.createElement('div');
  hdr.className = 'row';
  const logoSrc = getLogoSrc(stock);
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="${stock.name || stock.ticker} logo" style="height:22px;width:auto;opacity:.9;">`
    : '';
  hdr.innerHTML = `<div class="row" style="gap:10px;">${logoHtml}<h3 style="margin:0">${stock.name || stock.ticker} (${stock.ticker})</h3></div>`;
  card.appendChild(hdr);

  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  const canvas = document.createElement('canvas');
  canvas.id = `${stock.ticker}-chart`;
  wrap.appendChild(canvas);
  card.appendChild(wrap);

  if (!document.getElementById(card.id)) grid.appendChild(card);
  return card;
}

// Mount only on pages that have the container
function mountFeaturedCharts() {
  if (!document.getElementById('featuredContainer')) return;
  FEATURED_TICKERS.forEach(fetchFixedTicker);
}

document.addEventListener('DOMContentLoaded', mountFeaturedCharts);
