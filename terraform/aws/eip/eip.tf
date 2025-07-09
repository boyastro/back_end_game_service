resource "aws_eip" "tfer--eipalloc-0eabc3ec09468f854" {
  domain               = "vpc"
  instance             = "i-0e4af3c383efeed3c"
  network_border_group = "ap-southeast-1"
  network_interface    = "eni-07666360af4d3eb13"
  public_ipv4_pool     = "amazon"
  region               = "ap-southeast-1"
}
