const API_BASE_URL = 'https://hacker-news.firebaseio.com/v0';
const ITEMS_PER_PAGE = 10;
const LIVE_UPDATES_LIMIT = 10;
let currentPage = 0;
let currentFilter = 'story';
let isLoading = false;
let allLiveUpdates = [];
let currentItems = [];

// Fetch item details
async function fetchItem(id) {
    const response = await fetch(`${API_BASE_URL}/item/${id}.json`);
    return await response.json();
}

// Fetch items based on current filter
async function fetchItems() {
    let endpoint;
    switch (currentFilter) {
        case 'story':
            endpoint = `${API_BASE_URL}/newstories.json`;
            break;
        case 'job':
            endpoint = `${API_BASE_URL}/jobstories.json`;
            break;
        case 'poll':
            endpoint = `${API_BASE_URL}/pollstories.json`;
            break;
    }
    const response = await fetch(endpoint);
    return await response.json();
}

async function fetchPosts() {
    if (isLoading) return;
    isLoading = true;

    if (currentItems.length === 0) {
        currentItems = await fetchItems();
    }

    const postsList = document.getElementById('posts-list');
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const itemsToFetch = currentItems.slice(startIndex, endIndex);

    const posts = await Promise.all(itemsToFetch.map(fetchItem));
    posts.sort((a, b) => b.time - a.time);

    for (const post of posts) {
        displayPost(post);
    }

    currentPage++;
    isLoading = false;
}

// Fetch and display comments
async function fetchComments(commentIds, parentElement, isNested = false) {
    const comments = await Promise.all(commentIds.map(fetchItem));
    comments.sort((a, b) => b.time - a.time);

    for (const comment of comments) {
        if (comment && comment.text) {
            displayComment(comment, parentElement, isNested);
        }
    }
}

// Display a post
function displayPost(post) {
    const postsList = document.getElementById('posts-list');
    const postElement = document.createElement('li');
    postElement.classList.add('post');

    const title = post.title || post.type;
    const formattedTime = formatTimestamp(post.time);
    const commentCount = post.kids ? post.kids.length : 0;

    postElement.innerHTML = `
        <div class="post-header">
            <h3>${title}</h3>
            <div class="post-meta">
                <p>Posted: ${formattedTime}</p>
                <p>Comments: ${commentCount}</p>
            </div>
        </div>
        <div class="post-content">
            <p>By: ${post.by || 'Anonymous'}</p>
            <p>Score: ${post.score || 'N/A'}</p>
            ${post.url ? `<p><a href="${post.url}" target="_blank">Read more</a></p>` : ''}
            ${post.text ? `<div class="post-text">${post.text}</div>` : ''}
            <div class="comments-container"></div>
        </div>
    `;

    const postHeader = postElement.querySelector('.post-header');
    const postContent = postElement.querySelector('.post-content');

    postHeader.addEventListener('click', () => {
        if (postContent.style.display === 'none' || postContent.style.display === '') {
            postContent.style.display = 'block';
            if (post.kids && !postContent.querySelector('.comment')) {
                const commentsContainer = postContent.querySelector('.comments-container');
                fetchComments(post.kids, commentsContainer);
            }
        } else {
            postContent.style.display = 'none';
        }
    });

    postsList.appendChild(postElement);
}

// Display a comment
function displayComment(comment, parentElement, isNested = false) {
    const commentElement = document.createElement('div');
    commentElement.classList.add('comment');
    if (isNested) {
        commentElement.classList.add('nested-comment');
    }

    const formattedTime = formatTimestamp(comment.time);

    commentElement.innerHTML = `
        <div class="comment-content">${comment.text}</div>
        <div class="comment-meta">
            <p>By: ${comment.by || 'Anonymous'}</p>
            <p>Posted: ${formattedTime}</p>
        </div>
    `;

    if (comment.kids) {
        const showRepliesButton = document.createElement('button');
        showRepliesButton.textContent = `Show ${comment.kids.length} replies`;
        showRepliesButton.addEventListener('click', () => {
            const subCommentsContainer = document.createElement('div');
            subCommentsContainer.classList.add('sub-comments-container');
            commentElement.appendChild(subCommentsContainer);
            fetchComments(comment.kids, subCommentsContainer, true);
            showRepliesButton.style.display = 'none';
        });
        commentElement.appendChild(showRepliesButton);
    }

    parentElement.appendChild(commentElement);
}

// Format timestamp
function formatTimestamp(timestamp) {
    return new Date(timestamp * 1000).toLocaleString();
}

// Update live data
async function updateLiveData() {
    const latestItems = await fetchItems();
    const newItems = latestItems.filter(id => !currentItems.includes(id));
    
    if (newItems.length > 0) {
        const newPosts = await Promise.all(newItems.slice(0, LIVE_UPDATES_LIMIT).map(fetchItem));
        allLiveUpdates = [...newPosts, ...allLiveUpdates].slice(0, LIVE_UPDATES_LIMIT);
        displayLiveUpdates();
        currentItems = latestItems;
    }
}

// Display live updates
function displayLiveUpdates() {
    const liveUpdatesList = document.getElementById('live-updates-list');
    liveUpdatesList.innerHTML = '';
    
    allLiveUpdates.forEach((item) => {
        const listItem = document.createElement('li');
        const formattedTime = formatTimestamp(item.time);
        listItem.innerHTML = `
            ${item.type}: ${item.title || 'Item'}
            <div class="live-update-time">${formattedTime}</div>
        `;
        listItem.addEventListener('click', () => {
            displayPost(item);
            document.getElementById('posts-list').prepend(document.querySelector(`#posts-list .post:last-child`));
        });
        liveUpdatesList.appendChild(listItem);
    });
}

// Initialize the application
function init() {
    fetchPosts();
    updateLiveData();
    setInterval(updateLiveData, 5000);

    // Infinite scroll
    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            fetchPosts();
        }
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.type;
            document.getElementById('posts-list').innerHTML = '';
            currentPage = 0;
            currentItems = [];
            allLiveUpdates = [];
            fetchPosts();
            updateLiveData();
        });
    });
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);