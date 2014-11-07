# Load the Rails application.
require File.expand_path('../application', __FILE__)

# Initialize the Rails application.
DC::Application.initialize!

# CUSTOM: Edit AWS default host
AWS::S3::DEFAULT_HOST.replace "s3-eu-west-1.amazonaws.com"
