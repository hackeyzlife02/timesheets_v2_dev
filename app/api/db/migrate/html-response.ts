export function createHtmlResponse(data: any) {
  const { success, message, logs, error } = data

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Database Migration</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #2563eb;
    }
    .success {
      background-color: #d1fae5;
      border-left: 4px solid #10b981;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .error {
      background-color: #fee2e2;
      border-left: 4px solid #ef4444;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .logs {
      background-color: #f3f4f6;
      padding: 16px;
      border-radius: 4px;
      font-family: monospace;
      white-space: pre-wrap;
      margin-top: 20px;
    }
    .logs-title {
      font-weight: bold;
      margin-bottom: 8px;
    }
    .back-button {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      margin-top: 20px;
    }
    .back-button:hover {
      background-color: #1d4ed8;
    }
  </style>
</head>
<body>
  <h1>Database Migration</h1>
  
  <div class="${success ? "success" : "error"}">
    <h2>${success ? "Success" : "Error"}</h2>
    <p>${message}</p>
    ${error ? `<p><strong>Error details:</strong> ${typeof error === "object" ? JSON.stringify(error) : error}</p>` : ""}
  </div>
  
  <div class="logs">
    <div class="logs-title">Migration Logs:</div>
    ${logs.map((log: string) => `${log}`).join("<br>")}
  </div>
  
  <a href="/admin/database" class="back-button">Back to Database Admin</a>
</body>
</html>
  `
}

