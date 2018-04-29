# faultline API JSON Hyper-Schema
faultline API JSON Hyper-Schema.

- [Error](#error)
    - [GET /projects/:project/errors/:message](#get-projectsprojecterrorsmessage)
    - [GET /projects/:project/errors](#get-projectsprojecterrors)
    - [POST /projects/:project/errors](#post-projectsprojecterrors)
    - [PATCH /projects/:project/errors/:message](#patch-projectsprojecterrorsmessage)
    - [DELETE /projects/:project/errors/:message](#delete-projectsprojecterrorsmessage)
- [Occurrence](#occurrence)
    - [GET /projects/:project/errors/:message/occurrences/:reversedUnixtime](#get-projectsprojecterrorsmessageoccurrencesreversedunixtime)
    - [GET /projects/:project/errors/:message/occurrences](#get-projectsprojecterrorsmessageoccurrences)
- [Project](#project)
    - [GET /projects](#get-projects)
    - [DELETE /projects/:project](#delete-projectsproject)
- [Utility](#utility)
    - [POST /enctypt](#post-enctypt)

## Error
Error API.

### Properties

### GET /projects/:project/errors/:message
Get error.

```
GET /projects/{project}/errors/{message} HTTP/1.1
Host: api.example.com
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "error": {
      "project": "sample-project",
      "message": "Undefined index: faultline",
      "type": "notice",
      "backtrace": [
        {
          "file": "/var/www/test/test.php",
          "line": 15,
          "function": "SomeClass->__construct()"
        },
        {
          "file": "/var/www/test/SomeClass.class.php",
          "line": 36,
          "function": "SomeClass->callSomething()"
        }
      ],
      "event": {
      }
    },
    "timeline": {
      "errors": [
        {
          "project": "sample-project",
          "count": 3,
          "timestamp": "2016-12-05T11:55:00+00:00",
          "key": "sample-project##Undefined index: faultline",
          "message": "Undefined index: faultline",
          "type": "notice"
        }
      ],
      "totalCount": 1,
      "scannedCount": 1
    }
  }
}
```

### GET /projects/:project/errors
List errors.

```
GET /projects/{project}/errors HTTP/1.1
Host: api.example.com
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "errors": [
      {
        "project": {
          "name": "sample-project"
        },
        "count": 96,
        "lastUpdated": "2016-12-07T00:00:00+09:00",
        "message": "Undefined index: faultline",
        "status": "resolved",
        "type": "notice"
      }
    ],
    "scannedCount": 27
  }
}
```

### POST /projects/:project/errors
Push errors.

- notifier
    - Type: object
- errors
    - Type: array
- context
    - Type: object
- environment
    - Example: `{}`
    - Type: object
- session
    - Example: `{}`
    - Type: object
- params
    - Example: `{}`
    - Type: object
- notifications
    - Example: `[{"type"=>"slack", "endpoint"=>"https://hooks.slack.com/services/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", "channel"=>"#random", "username"=>"faultline-notify", "notifyInterval"=>5, "threshold"=>10}]`
    - Type: array

```
POST /projects/{project}/errors HTTP/1.1
Content-Type: application/json
Host: api.example.com

{
  "notifier": {
    "name": "fautline-client",
    "version": "0.0.1",
    "url": "https://github.com/k1LoW/faultline"
  },
  "errors": [
    {
      "type": "notice",
      "message": "Undefined index: faultline",
      "backtrace": [
        {
          "file": "/var/www/path/to/app/user.php",
          "function": "SomeClass->__construct()",
          "line": 15,
          "column": 23,
          "code": {
            "1": "code",
            "2": "code code"
          }
        }
      ],
      "timestamp": "2016-12-07T00:00:00+09:00"
    }
  ],
  "context": {
    "environment": "production",
    "component": "users",
    "action": "edit",
    "os": "CentOS Linux release 7.2.1511",
    "language": "php",
    "version": "7.1.0",
    "url": "https://example.com/users/edit",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36",
    "rootDirectory": "/var/www/path/to/app/"
  },
  "environment": {
  },
  "session": {
  },
  "params": {
  },
  "notifications": [
    {
      "type": "slack",
      "endpoint": "https://hooks.slack.com/services/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",
      "channel": "#random",
      "username": "faultline-notify",
      "notifyInterval": 5,
      "threshold": 10
    }
  ]
}
```

```
HTTP/1.1 201 Created
Content-Type: application/json

{
  "data": {
    "errors": {
      "postCount": 27
    }
  }
}
```

### PATCH /projects/:project/errors/:message
Update error status.

- status
    - Example: `"resolved"`

```
PATCH /projects/{project}/errors/{message} HTTP/1.1
Content-Type: application/json
Host: api.example.com

{
  "status": "resolved"
}
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "error": {
      "project": {
        "name": "sample-project"
      },
      "count": 96,
      "lastUpdated": "2016-12-07T00:00:00+09:00",
      "message": "Undefined index: faultline",
      "status": "resolved",
      "type": "notice"
    }
  }
}
```

### DELETE /projects/:project/errors/:message
Delete error.

```
DELETE /projects/{project}/errors/{message} HTTP/1.1
Host: api.example.com
```

```
HTTP/1.1 204 No Content
```

## Occurrence
Error Occurrence API.

### Properties

### GET /projects/:project/errors/:message/occurrences/:reversedUnixtime
Get error occurrence.

```
GET /projects/{project}/errors/{message}/occurrences/{reversedUnixtime} HTTP/1.1
Host: api.example.com
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "error": {
      "project": "sample-project",
      "message": "Undefined index: faultline",
      "type": "notice",
      "backtrace": [
        {
          "file": "/var/www/test/test.php",
          "line": 15,
          "function": "SomeClass->__construct()"
        },
        {
          "file": "/var/www/test/SomeClass.class.php",
          "line": 36,
          "function": "SomeClass->callSomething()"
        }
      ],
      "event": {
      },
      "timestamp": "2017-05-16T13:36:27+00:00",
      "reversedUnixtime": "9007197759799204"
    }
  }
}
```

### GET /projects/:project/errors/:message/occurrences
List error occurrences.

```
GET /projects/{project}/errors/{message}/occurrences HTTP/1.1
Host: api.example.com
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "errors": [
      {
        "project": "sample-project",
        "message": "Undefined index: faultline",
        "type": "notice",
        "backtrace": [
          {
            "file": "/var/www/test/test.php",
            "line": 15,
            "function": "SomeClass->__construct()"
          },
          {
            "file": "/var/www/test/SomeClass.class.php",
            "line": 36,
            "function": "SomeClass->callSomething()"
          }
        ],
        "event": {
        },
        "timestamp": "2017-05-16T13:36:27+00:00",
        "reversedUnixtime": "9007197759799204"
      }
    ],
    "totalCount": 10
  }
}
```

## Project
Project API.

### Properties

### GET /projects
List projects.

```
GET /projects HTTP/1.1
Host: api.example.com
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "projects": [
      {
        "name": "sample-project"
      }
    ]
  }
}
```

### DELETE /projects/:project
Delete project.

```
DELETE /projects/{project} HTTP/1.1
Host: api.example.com
```

```
HTTP/1.1 204 No Content
```

## Utility
Utility API.

### Properties

### POST /enctypt
Enctypt payload by AWS KMS.


```
POST /enctypt HTTP/1.1
Host: api.example.com
```

```
HTTP/1.1 201 Created
Content-Type: application/json

{
  "data": {
    "encrypted": "VJrcSNSvM/KxZ3IIa/+aaEZMfYQgKrGqmGwzgAAASYwggEiBgkqhkiG9w0BBwagggETMIIBDwIBADCCAQgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMkrC8qGdnuIcfRlX9AgEQgIHaanVWXGDANlr/QkgYFIpSRy5QLmJohU4ltwGKVywOFA/uRZfKw3kAMCuH7H/QJJyVA0mxzqMnQT/WUf6nG2AckhPQ4fTmgQgpXzw7jF4ToUvXL49a"
  }
}
```

