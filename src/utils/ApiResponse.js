class ApiResponse {
  static success(res, statusCode = 200, message = "Success", data = {}) {
    return res.status(statusCode).json({
      status: "success",
      message,
      data,
    });
  }

  static paginated(res, message = "Success", data = [], pagination = {}) {
    return res.status(200).json({
      status: "success",
      message,
      pagination,
      data,
    });
  }
}

module.exports = ApiResponse;