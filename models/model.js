const db = require("../db/connection");
const {
  checkReviewExists,
  checkUsernameExists,
  categoryList,
  checkCommentExists,
} = require("../app_utils.js/utils");
const format = require("pg-format");

exports.fetchCategories = () => {
  let queryStr = "SELECT * FROM categories";
  return db.query(queryStr).then(({ rows }) => {
    return rows;
  });
};

exports.fetchReviews = (sort_by = "created_at", order = "DESC", category) => {
  return categoryList()
    .then(({ rows }) => {
      const categoryVal = [];
      const sortWhitelist = [
        "title",
        "designer",
        "owner",
        "review_img_url",
        "review_body",
        "category",
        "created_at",
        "votes",
        "comment_count",
      ];
      const orderWhitelist = ["ASC", "DESC"];

      const categoryWhitelist = rows.map((category) => {
        return category.slug;
      });

      if (category) {
        if (!categoryWhitelist.includes(category)) {
          return Promise.reject({ status: 400, msg: "Invalid category" });
        }
      }

      if (!sortWhitelist.includes(sort_by)) {
        return Promise.reject({ status: 400, msg: "Invalid sort query" });
      }

      if (!orderWhitelist.includes(order.toUpperCase())) {
        return Promise.reject({ status: 400, msg: "Invalid order query" });
      }

      let queryStr = `
      SELECT owner, title, reviews.review_id, category, review_img_url, reviews.created_at, designer, reviews.votes, COUNT(comments.review_id)::INT AS comment_count FROM reviews
      LEFT JOIN comments ON reviews.review_id = comments.review_id`;

      if (category) {
        queryStr += ` WHERE category = $1`;
        categoryVal.push(category);
      }

      queryStr += ` 
    GROUP BY reviews.owner, reviews.title, reviews.review_id, category, review_img_url, reviews.created_at, designer, reviews.votes
    ORDER BY ${sort_by} ${order};
    `;
      return db.query(queryStr, categoryVal);
    })
    .then(({ rows }) => {
      return rows;
    });
};

exports.fetchReviewById = (review_id) => {
  let queryStr = `
          SELECT reviews.review_id, title, review_body, designer, review_img_url, reviews.votes, category, owner, reviews.created_at, COUNT(comments.review_id)::INT AS comment_count FROM reviews 
          LEFT JOIN comments ON reviews.review_id = comments.review_id 
          WHERE reviews.review_id = $1
          GROUP BY reviews.owner, reviews.title, reviews.review_id, category, review_img_url, reviews.created_at, designer, reviews.votes
          `;

  return db.query(queryStr, [review_id]).then(({ rows }) => {
    if (rows.length === 0) {
      return Promise.reject({ status: 404, msg: "Id not found" });
    }
    return rows[0];
  });
};

exports.fetchCommentByReview = (review_id) => {
  return checkReviewExists(review_id)
    .then(() => {
      let queryStr = `
        SELECT  
        comment_id, votes, created_at, author, body, review_id 
        FROM comments WHERE review_id = $1
        ORDER BY created_at DESC
        `;

      return db.query(queryStr, [review_id]);
    })
    .then(({ rows }) => {
      return rows;
    });
};

exports.insertComment = (review_id, data) => {
  const { username, body } = data;
  return checkReviewExists(review_id)
    .then(() => {
      return checkUsernameExists(review_id, data);
    })
    .then(() => {
      const queryVals = [0, new Date(), username, body, review_id];
      const queryStr = `INSERT INTO comments (votes, created_at, author, body, review_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
      return db.query(queryStr, queryVals);
    })
    .then(({ rows }) => {
      return rows[0];
    });
};

exports.updatedVote = (review_id, inc_vote) => {
  return checkReviewExists(review_id)
    .then(() => {
      if (typeof inc_vote !== "number") {
        return Promise.reject({ status: 400, msg: "Bad request" });
      }
      let queryStr = `
          UPDATE reviews
              SET votes = votes + ${inc_vote}
          WHERE review_id = $1
          RETURNING *
        `;
      const queryVals = [review_id];
      return db.query(queryStr, queryVals);
    })
    .then(({ rows }) => {
      return rows[0];
    });
};

exports.fetchUsers = () => {
  let queryStr = `
      SELECT * FROM users
      `;
  return db.query(queryStr).then(({ rows }) => {
    return rows;
  });
};

exports.removeComment = (comment_id) => {
  return checkCommentExists(comment_id).then(() => {
    const queryStr = `
    DELETE FROM comments WHERE comment_id = $1
    `;

    return db.query(queryStr, [comment_id]);
  });
};
