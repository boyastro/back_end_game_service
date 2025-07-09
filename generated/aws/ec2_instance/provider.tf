provider "aws" {
  region = "ap-southeast-1"
}

terraform {
	required_providers {
		aws = {
	    version = "~> 6.2.0"
		}
  }
}
