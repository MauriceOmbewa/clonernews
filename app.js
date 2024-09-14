const apiUrl = 'https://hacker-news.firebaseio.com/v0/';
let postIds = [];
let currentPostIndex = 0;
const postsPerPage = 10;

// Fetch initial posts
async function fetchPostIds() {
    const response = await fetch(`${apiUrl}topstories.json`);
    postIds = await response.json();
    loadPosts();
}

// Load a batch of posts
async function loadPosts() {
    const postsContainer = document.getElementById('posts');
    const postsSlice = postIds.slice(currentPostIndex, currentPostIndex + postsPerPage);
    
    for (const id of postsSlice) {
        const post = await fetchPost(id);
        postsContainer.appendChild(createPostElement(post));
    }
    
    currentPostIndex += postsPerPage;
    if (currentPostIndex >= postIds.length) {
        document.getElementById('load-more').style.display = 'none';
    }
}

// Fetch individual post details
async function fetchPost(id) {
    const response = await fetch(`${apiUrl}item/${id}.json`);
    return await response.json();
}

// Create post HTML element
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.innerHTML = `
        <h2>${post.title}</h2>
        <p><strong>Type:</strong> ${post.type}</p>
        <p><strong>Score:</strong> ${post.score}</p>
        <p><strong>Comments:</strong> ${post.descendants || 0}</p>
        <button onclick="loadComments(${post.id})">View Comments</button>
        <div id="comments-${post.id}" class="comments"></div>
    `;
    return postDiv;
}

// Load comments for a post
async function loadComments(postId) {
    const commentsContainer = document.getElementById(`comments-${postId}`);
    const post = await fetchPost(postId);
    
    if (post.comments) {
        const comments = await Promise.all(post.kids.map(id => fetchComment(id)));
        comments.forEach(comment => {
            commentsContainer.appendChild(createCommentElement(comment));
        });
    }
}

// Fetch individual comment
async function fetchComment(id) {
    const response = await fetch(`${apiUrl}item/${id}.json`);
    return await response.json();
}

// Create comment HTML element
function createCommentElement(comment) {
    const commentDiv = document.createElement('div');
    commentDiv.innerHTML = `
        <div><strong>${comment.by}</strong>: ${comment.text}</div>
    `;
    return commentDiv;
}

// Throttle function to limit API calls
function throttle(fn, wait) {
    let lastTime = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastTime >= wait) {
            lastTime = now;
            return fn.apply(this, args);
        }
    };
}

// Live updates every 5 seconds
setInterval(throttle(async () => {
    const newPostIds = await fetch(`${apiUrl}topstories.json`).then(res => res.json());
    if (newPostIds.length !== postIds.length || newPostIds[0] !== postIds[0]) {
        alert('New posts available!');
        postIds = newPostIds;
        currentPostIndex = 0;
        document.getElementById('posts').innerHTML = '';
        loadPosts();
    }
}, 5000), 5000);

// Load initial data
fetchPostIds();

// Load more posts on button click
document.getElementById('load-more').addEventListener('click', loadPosts);
