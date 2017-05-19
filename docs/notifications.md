# Notifications

When receive error, faultline can send nofitications with POST config.

## :speech_balloon: Slack

POST errors with slack notification config like [this](../sample-errors.json).

![slack](https://faultline.github.io/faultline/slack.png)

## :octocat: GitHub issue

POST errors with GitHub repo config for creating issue, like following code

```json5
{
  "errors": [

   - snip -

  ],
  "notifications": [

    - snip -

    {
      "type": "github",
      "userToken": "XXXXXXXxxxxXXXXXXxxxxxXXXXXXXXXX",
      "owner": "k1LoW",
      "repo": "faultline",
      "labels": [
        "faultline", "bug"
      ],
      "if_exist": "reopen-and-comment",
      "notifyInterval": 10,
      "threshold": 1,
      "timezone": "Asia/Tokyo"
    }
  ]
}
```

![GitHub](https://faultline.github.io/faultline/github.png)

# :closed_lock_with_key: AWS KMS Encryption of `notifications` config

If you use faultline notifications on browser ( e.g [faultline-js](https://github.com/faultline/faultline-js) ), you should encrypt config.

## :key: STEP 1. `useKms` option true

Set `useKms: true` in config.yml, and deploy. Default AWS KMS Key alias is `alias/faultline`.

## :closed_lock_with_key: STEP 2. Encrypt notification config

Use `aws kms encrypt` command.

```sh
$ AWS_PROFILE=XXxxXXX aws kms encrypt --key-id alias/faultline --plaintext '{"type":"slack","endpoint":"https://hooks.slack.com/services/XXXXXXXX/XXXXXXXX/XXXxxXXXXXXxxxxXXXXXXX","channel":"#random","username":"faultline-notify","notifyInterval":5,"threshold":10}' --query CiphertextBlob --output text --region ap-northeast-1
XXXXXXxxxxXXXXXxxxxxxxxxxxxXXXXXXXXXXXXXxxxxxxxxxxxXXXXXxxxxxxxxXXXXxxxxxxxxXXXXXXXXXXXXxxxxx
```

OR

Use `/encrypt` API with apiKey (not clientApiKey).

```sh
$ curl -X POST -H "x-api-key:0123456789012345678901234567890" -H "Content-Type: application/json" https://xxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/v0/encrypt -d '{"type":"github","userToken":"XXXXXXXxxxxXXXXXXxxxxxXXXXXXXXXX","owner":"k1LoW","repo":"faultline","labels":["faultline","bug"],"if_exist":"reopen-and-comment","notifyInterval":10,"threshold":1,"timezone":"Asia/Tokyo"}'
{
  "status": "success",
  "encrypted": "ZZZZZZzzzzZZZZZzzzzzzzzzzzzZZZZZZZZZZZZZzzzzzzzzzzzZZZZZzzzzzzzzZZZZzzzzzzzzZZZZZZZZZZZZzzzzz"
}
```

## :lock: STEP 3. Set encrypted text as `notifications` config

```json5
{
  "errors": [

   - snip -

  ],
  "notifications": [
    "XXXXXXxxxxXXXXXxxxxxxxxxxxxXXXXXXXXXXXXXxxxxxxxxxxxXXXXXxxxxxxxxXXXXxxxxxxxxXXXXXXXXXXXXxxxxx",
    "ZZZZZZzzzzZZZZZzzzzzzzzzzzzZZZZZZZZZZZZZzzzzzzzzzzzZZZZZzzzzzzzzZZZZzzzzzzzzZZZZZZZZZZZZzzzzz",
    {
      "type": "slack",
      "endpoint": "https://hooks.slack.com/services/XXXXXXXX/XXXXXXXX/XXXxxXXXXXXxxxxXXXXXXX",
      "channel": "#faultline-other-channel",
      "username": "faultline-notify",
      "notifyInterval": 10,
      "threshold": 1
    }
  ]
}
```
