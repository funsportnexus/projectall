import json
import os
import urllib.request
from datetime import datetime, timezone

GH_TOKEN = os.environ["GH_TOKEN"]
PROJECT_OWNER = os.environ["PROJECT_OWNER"]
PROJECT_NUMBER = int(os.environ["PROJECT_NUMBER"])

QUERY = """
query($login: String!, $number: Int!) {
  organization(login: $login) {
    projectV2(number: $number) {
      title
      items(first: 100) {
        nodes {
          id
          content {
            ... on Issue {
              number
              title
              url
              state
              body
              assignees(first: 10) {
                nodes {
                  login
                }
              }
            }
          }
          fieldValueByName(name: "Event") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          fieldValueByName(name: "Category") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          fieldValueByName(name: "Priority") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          fieldValueByName(name: "Phase") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          fieldValueByName(name: "Source") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          fieldValueByName(name: "Owner") {
            ... on ProjectV2ItemFieldTextValue { text }
          }
          fieldValueByName(name: "Notes") {
            ... on ProjectV2ItemFieldTextValue { text }
          }
          fieldValueByName(name: "Due") {
            ... on ProjectV2ItemFieldDateValue { date }
          }
        }
      }
    }
  }
  user(login: $login) {
    projectV2(number: $number) {
      title
      items(first: 100) {
        nodes {
          id
          content {
            ... on Issue {
              number
              title
              url
              state
              body
              assignees(first: 10) {
                nodes {
                  login
                }
              }
            }
          }
          fieldValueByName(name: "Event") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          fieldValueByName(name: "Category") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          fieldValueByName(name: "Priority") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          fieldValueByName(name: "Phase") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          fieldValueByName(name: "Source") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          fieldValueByName(name: "Owner") {
            ... on ProjectV2ItemFieldTextValue { text }
          }
          fieldValueByName(name: "Notes") {
            ... on ProjectV2ItemFieldTextValue { text }
          }
          fieldValueByName(name: "Due") {
            ... on ProjectV2ItemFieldDateValue { date }
          }
        }
      }
    }
  }
}
"""


def gql(query, variables):
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=json.dumps({"query": query, "variables": variables}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {GH_TOKEN}",
            "Content-Type": "application/json",
            "Accept": "application/vnd.github+json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))


def pick_project(data):
    org_proj = (((data.get("data") or {}).get("organization") or {}).get("projectV2"))
    user_proj = (((data.get("data") or {}).get("user") or {}).get("projectV2"))
    return org_proj or user_proj


def field_name(node, key):
    value = node.get(key) or {}
    return value.get("name") or value.get("text") or value.get("date")


def main():
    result = gql(QUERY, {"login": PROJECT_OWNER, "number": PROJECT_NUMBER})
    if "errors" in result:
        raise RuntimeError(json.dumps(result["errors"], ensure_ascii=False, indent=2))

    project = pick_project(result)
    if not project:
        raise RuntimeError("Project not found. Check PROJECT_OWNER / PROJECT_NUMBER / token scope.")

    items = []
    for node in project["items"]["nodes"]:
        content = node.get("content")
        if not content:
            continue

        assignees = [a["login"] for a in content.get("assignees", {}).get("nodes", [])]

        item = {
            "id": node["id"],
            "issue_number": content.get("number"),
            "title": content.get("title"),
            "url": content.get("url"),
            "state": content.get("state"),
            "event": field_name(node, 'fieldValueByName(name: "Event")'),
            "category": field_name(node, 'fieldValueByName(name: "Category")'),
            "priority": field_name(node, 'fieldValueByName(name: "Priority")'),
            "status": field_name(node, 'fieldValueByName(name: "Status")'),
            "phase": field_name(node, 'fieldValueByName(name: "Phase")'),
            "source": field_name(node, 'fieldValueByName(name: "Source")'),
            "owner": field_name(node, 'fieldValueByName(name: "Owner")'),
            "notes": field_name(node, 'fieldValueByName(name: "Notes")'),
            "due": field_name(node, 'fieldValueByName(name: "Due")'),
            "assignees": assignees,
            "body": content.get("body"),
        }
        items.append(item)

    payload = {
        "project_title": project["title"],
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "items": items,
    }

    os.makedirs("docs/data", exist_ok=True)
    with open("docs/data/tasks.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Exported {len(items)} items to docs/data/tasks.json")


if __name__ == "__main__":
    main()
