const express = require("express");
const {
  getCategories,
  getReviews,
  getReviewById,
  getCommentsByReview,
  postCommentToReview,
  patchReviewById,
  getUsers,
  deleteCommentById,
  getEndpointList,
} = require("./controllers/index");
const app = express();
app.use(express.json());

app.get("/api", getEndpointList);
app.get("/api/health", (req, res) => {
  res.status(200).send({ msg: "Server up and running" });
});

app.get("/api/categories", getCategories);
app.get("/api/reviews", getReviews);
app.get("/api/reviews/:review_id", getReviewById);
app.get("/api/reviews/:review_id/comments", getCommentsByReview);
app.get("/api/users", getUsers);

app.post("/api/reviews/:review_id/comments", postCommentToReview);
app.patch("/api/reviews/:review_id", patchReviewById);
app.delete("/api/comments/:comment_id", deleteCommentById);

app.use((err, req, res, next) => {
  if (err.code === "22P02") {
    res.status(400).send({ msg: "Bad request" });
  } else if (err.status && err.msg) {
    res.status(err.status).send({ msg: err.msg });
  }
});

app.all("*", (req, res) => {
  res.status(404).send({ msg: "Route not found" });
});

module.exports = app;
