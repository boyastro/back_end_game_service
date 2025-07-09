resource "aws_instance" "tfer--i-0e4af3c383efeed3c_k3s-server" {
  ami                         = "ami-09899993ae9d4459d"
  associate_public_ip_address = "true"
  availability_zone           = "ap-southeast-1a"

  capacity_reservation_specification {
    capacity_reservation_preference = "open"
  }

  cpu_options {
    core_count       = "1"
    threads_per_core = "1"
  }

  credit_specification {
    cpu_credits = "standard"
  }

  disable_api_stop        = "false"
  disable_api_termination = "false"
  ebs_optimized           = "false"

  enclave_options {
    enabled = "false"
  }

  get_password_data                    = "false"
  hibernation                          = "false"
  instance_initiated_shutdown_behavior = "stop"
  instance_type                        = "t2.micro"
  ipv6_address_count                   = "0"
  key_name                             = "my-ec2-key"

  maintenance_options {
    auto_recovery = "default"
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_protocol_ipv6          = "disabled"
    http_put_response_hop_limit = "1"
    http_tokens                 = "optional"
    instance_metadata_tags      = "disabled"
  }

  monitoring                 = "false"
  placement_partition_number = "0"

  private_dns_name_options {
    enable_resource_name_dns_a_record    = "false"
    enable_resource_name_dns_aaaa_record = "false"
    hostname_type                        = "ip-name"
  }

  private_ip = "172.31.30.34"
  region     = "ap-southeast-1"

  root_block_device {
    delete_on_termination = "true"
    encrypted             = "false"
    volume_size           = "8"
    volume_type           = "gp2"
  }

  security_groups   = ["my-k3s-sg"]
  source_dest_check = "true"
  subnet_id         = "subnet-05499ffd6e588dbfe"

  tags = {
    Name = "k3s-server"
  }

  tags_all = {
    Name = "k3s-server"
  }

  tenancy                = "default"
  vpc_security_group_ids = ["sg-04ee107a5dfd36cbb"]
}
