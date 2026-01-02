using Microsoft.AspNetCore.Mvc;
using NotificationService.Services;

namespace NotificationService.Controllers;

[ApiController]
public class SmsInboxController : ControllerBase
{
    private readonly SmsInboxStore _store;

    public SmsInboxController(SmsInboxStore store)
    {
        _store = store;
    }

    [HttpGet("/sms-inbox")]
    public IActionResult InboxHtml([FromQuery] int take = 50)
    {
        var msgs = _store.GetLatest(take);

        var rows = string.Join("\n", msgs.Select(m =>
            $"<tr><td>{System.Net.WebUtility.HtmlEncode(m.CreatedAtUtc.ToString("u"))}</td>" +
            $"<td>{System.Net.WebUtility.HtmlEncode(m.To)}</td>" +
            $"<td style='white-space:pre-wrap'>{System.Net.WebUtility.HtmlEncode(m.Body)}</td>" +
            $"<td style='white-space:pre-wrap'>{System.Net.WebUtility.HtmlEncode(m.Metadata ?? "")}</td></tr>"));

        var html = $@"<!doctype html>
<html>
<head>
  <meta charset='utf-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1' />
  <title>SMS Inbox (dev)</title>
  <style>
    body {{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; }}
    h1 {{ margin: 0 0 8px; }}
    .muted {{ opacity: .75; margin-bottom: 16px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; vertical-align: top; }}
    th {{ background: #f7f7f7; text-align: left; }}
    .actions {{ display:flex; gap: 8px; margin: 16px 0; }}
    button {{ padding: 8px 12px; cursor: pointer; }}
  </style>
</head>
<body>
  <h1>SMS Inbox (dev)</h1>
  <div class='muted'>To jest lokalna skrzynka SMS – wiadomości są przechowywane w pamięci procesu NotificationService.</div>

  <div class='actions'>
    <form method='post' action='/sms-inbox/clear'>
      <button type='submit'>Wyczyść</button>
    </form>
    <a href='/sms-inbox?take={take}'>Odśwież</a>
    <a href='/swagger'>Swagger</a>
  </div>

  <table>
    <thead>
      <tr>
        <th>Czas (UTC)</th>
        <th>Do</th>
        <th>Treść</th>
        <th>Metadata</th>
      </tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </table>
</body>
</html>";

        return Content(html, "text/html; charset=utf-8");
    }

    [HttpGet("/sms-inbox/api")]
    public ActionResult<IReadOnlyList<SmsInboxMessage>> InboxJson([FromQuery] int take = 100)
    {
        return Ok(_store.GetLatest(take));
    }

    [HttpPost("/sms-inbox/clear")]
    public IActionResult Clear()
    {
        _store.Clear();
        return Redirect("/sms-inbox");
    }
}
